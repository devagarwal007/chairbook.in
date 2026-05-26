-- Service timing and controlled appointment progress.
-- Event timestamps are stored as TIMESTAMPTZ. PostgreSQL stores these instants in UTC.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER
  GENERATED ALWAYS AS (
    CASE
      WHEN started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at
      THEN FLOOR(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60)::INTEGER
      ELSE NULL
    END
  ) STORED;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('Pending', 'Confirmed', 'Arrived', 'In Service', 'Completed', 'Paid', 'No-show', 'Cancelled'));

CREATE INDEX IF NOT EXISTS idx_bookings_timing_status
  ON public.bookings(salon_id, date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_completed_at
  ON public.bookings(salon_id, completed_at)
  WHERE completed_at IS NOT NULL;

REVOKE SELECT (arrived_at, started_at, completed_at, actual_duration_minutes)
  ON public.bookings
  FROM anon;

CREATE OR REPLACE FUNCTION public.booking_progress_rpc_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.booking_progress_rpc', true), '') = 'on';
$$;

CREATE OR REPLACE FUNCTION public.guard_booking_timing_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.booking_progress_rpc_enabled() THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      AND NEW.status IN ('Arrived', 'In Service') THEN
      RAISE EXCEPTION 'Booking progress statuses can only be changed by booking progress actions';
    END IF;

    IF NEW.arrived_at IS DISTINCT FROM OLD.arrived_at
      OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
      RAISE EXCEPTION 'Booking timing fields can only be changed by booking progress actions';
    END IF;

    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      IF NOT (
        OLD.completed_at IS NULL
        AND NEW.completed_at IS NULL
        AND NEW.status IN ('Completed', 'Paid')
      ) THEN
        RAISE EXCEPTION 'Booking timing fields can only be changed by booking progress actions';
      END IF;
    END IF;
  END IF;

  IF NEW.status IN ('Completed', 'Paid')
    AND OLD.completed_at IS NULL
    AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;

  IF NEW.completed_at IS NOT NULL
    AND NEW.started_at IS NOT NULL
    AND NEW.completed_at < NEW.started_at THEN
    RAISE EXCEPTION 'completed_at cannot be before started_at';
  END IF;

  IF NEW.started_at IS NOT NULL
    AND NEW.arrived_at IS NOT NULL
    AND NEW.started_at < NEW.arrived_at THEN
    RAISE EXCEPTION 'started_at cannot be before arrived_at';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_timing_update ON public.bookings;
CREATE TRIGGER guard_booking_timing_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.guard_booking_timing_update();

CREATE OR REPLACE FUNCTION public.guard_stylist_booking_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.owns_salon(OLD.salon_id) THEN
    RETURN NEW;
  END IF;

  IF OLD.stylist_id = public.current_stylist_id() THEN
    IF NOT public.booking_progress_rpc_enabled()
      AND NEW.status IS DISTINCT FROM OLD.status
      AND NEW.status IN ('Arrived', 'In Service', 'Completed', 'Paid') THEN
      RAISE EXCEPTION 'Stylists must use booking progress actions to advance service status';
    END IF;

    IF NEW.salon_id IS DISTINCT FROM OLD.salon_id
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.stylist_id IS DISTINCT FROM OLD.stylist_id
      OR NEW.date IS DISTINCT FROM OLD.date
      OR NEW.start_time IS DISTINCT FROM OLD.start_time
      OR NEW.duration IS DISTINCT FROM OLD.duration
      OR NEW.source IS DISTINCT FROM OLD.source
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
      OR NEW.bill_subtotal IS DISTINCT FROM OLD.bill_subtotal
      OR NEW.discount_type IS DISTINCT FROM OLD.discount_type
      OR NEW.discount_value IS DISTINCT FROM OLD.discount_value
      OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
      OR NEW.tip_amount IS DISTINCT FROM OLD.tip_amount
      OR NEW.round_off_amount IS DISTINCT FROM OLD.round_off_amount
      OR NEW.bill_total IS DISTINCT FROM OLD.bill_total
      OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
      OR NEW.amount_due IS DISTINCT FROM OLD.amount_due
      OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
      OR (
        NOT public.booking_progress_rpc_enabled()
        AND (
          NEW.arrived_at IS DISTINCT FROM OLD.arrived_at
          OR NEW.started_at IS DISTINCT FROM OLD.started_at
          OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
        )
      ) THEN
      RAISE EXCEPTION 'Stylists can only update appointment progress and notes';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_booking_status(
  p_booking_id UUID,
  p_action TEXT
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_duration_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_now TIMESTAMPTZ;
  v_is_owner BOOLEAN;
  v_is_stylist BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_is_owner := COALESCE(public.owns_salon(v_booking.salon_id), false);
  v_is_stylist := COALESCE(v_booking.stylist_id = public.current_stylist_id(), false);

  IF NOT (v_is_owner OR v_is_stylist) THEN
    RAISE EXCEPTION 'You do not have access to update this booking';
  END IF;

  IF v_booking.status IN ('Cancelled', 'No-show') THEN
    RAISE EXCEPTION 'Cancelled and no-show bookings cannot be advanced';
  END IF;

  v_now := now();
  PERFORM set_config('app.booking_progress_rpc', 'on', true);

  IF p_action = 'mark_arrived' THEN
    IF v_booking.status <> 'Confirmed' THEN
      RAISE EXCEPTION 'Only confirmed bookings can be marked arrived';
    END IF;

    UPDATE public.bookings b
    SET status = 'Arrived',
        arrived_at = COALESCE(b.arrived_at, v_now)
    WHERE b.id = p_booking_id;

  ELSIF p_action = 'start_service' THEN
    IF v_booking.status <> 'Arrived' THEN
      RAISE EXCEPTION 'Only arrived bookings can start service';
    END IF;

    UPDATE public.bookings b
    SET status = 'In Service',
        arrived_at = COALESCE(b.arrived_at, v_now),
        started_at = COALESCE(b.started_at, v_now)
    WHERE b.id = p_booking_id;

  ELSIF p_action = 'complete_service' THEN
    IF v_booking.status NOT IN ('In Service', 'Completed', 'Paid') THEN
      RAISE EXCEPTION 'Only in-service bookings can be completed';
    END IF;

    UPDATE public.bookings b
    SET status = CASE WHEN b.status = 'Paid' THEN 'Paid' ELSE 'Completed' END,
        started_at = COALESCE(b.started_at, v_now),
        completed_at = COALESCE(b.completed_at, v_now),
        payment_status = CASE
          WHEN b.payment_status IN ('paid', 'partial') THEN b.payment_status
          ELSE 'due'
        END
    WHERE b.id = p_booking_id;

  ELSE
    RAISE EXCEPTION 'Unknown booking progress action';
  END IF;

  RETURN QUERY
  SELECT b.id, b.status, b.arrived_at, b.started_at, b.completed_at, b.actual_duration_minutes
  FROM public.bookings b
  WHERE b.id = p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_booking_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_progress_rpc_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_booking_status(UUID, TEXT) TO authenticated;

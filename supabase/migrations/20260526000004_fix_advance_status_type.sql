-- Fix type mismatch in advance_booking_status RPC function.
-- b.status is VARCHAR(50), but the function returns status as TEXT.
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
  SELECT b.id, b.status::text, b.arrived_at, b.started_at, b.completed_at, b.actual_duration_minutes
  FROM public.bookings b
  WHERE b.id = p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_booking_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_booking_status(UUID, TEXT) TO authenticated;

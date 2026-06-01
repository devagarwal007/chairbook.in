-- Add salon-level advance booking window and enforce it for booking writes.

ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS booking_window_days INTEGER DEFAULT 7;

UPDATE public.salons
SET booking_window_days = 7
WHERE booking_window_days IS NULL
   OR booking_window_days < 1
   OR booking_window_days > 365;

ALTER TABLE public.salons
ALTER COLUMN booking_window_days SET DEFAULT 7,
ALTER COLUMN booking_window_days SET NOT NULL;

ALTER TABLE public.salons
DROP CONSTRAINT IF EXISTS salons_booking_window_days_check;

ALTER TABLE public.salons
ADD CONSTRAINT salons_booking_window_days_check
CHECK (booking_window_days BETWEEN 1 AND 365);

CREATE OR REPLACE FUNCTION public.guard_booking_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_days INTEGER;
  v_timezone TEXT;
  v_today DATE;
BEGIN
  SELECT
    COALESCE(s.booking_window_days, 7),
    COALESCE(NULLIF(s.timezone, ''), 'Asia/Kolkata')
  INTO v_window_days, v_timezone
  FROM public.salons s
  WHERE s.id = NEW.salon_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_window_days := LEAST(365, GREATEST(1, v_window_days));
  v_today := (now() AT TIME ZONE v_timezone)::date;

  IF NEW.date < v_today OR NEW.date > (v_today + (v_window_days - 1)) THEN
    RAISE EXCEPTION 'Bookings can only be scheduled within the next % day(s)', v_window_days
      USING ERRCODE = '22008';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_window ON public.bookings;
CREATE TRIGGER guard_booking_window
BEFORE INSERT OR UPDATE OF salon_id, date ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.guard_booking_window();

GRANT EXECUTE ON FUNCTION public.guard_booking_window() TO authenticated;

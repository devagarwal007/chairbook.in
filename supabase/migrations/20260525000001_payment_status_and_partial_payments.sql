-- Payment status and partial-payment ledger support.
-- Keeps appointment completion separate from money collection.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'due',
  ADD COLUMN IF NOT EXISTS bill_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NOT NULL DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS round_off_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS bill_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_payment_status_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payment_status_check
      CHECK (payment_status IN ('due', 'partial', 'paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_discount_type_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_discount_type_check
      CHECK (discount_type IN ('amount', 'percent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_billing_amounts_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_billing_amounts_check
      CHECK (
        bill_subtotal >= 0
        AND discount_value >= 0
        AND discount_amount >= 0
        AND tip_amount >= 0
        AND bill_total >= 0
        AND amount_paid >= 0
        AND amount_due >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_discount_percent_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_discount_percent_check
      CHECK (discount_type <> 'percent' OR discount_value <= 100);
  END IF;
END $$;

-- The original schema stored only one payment per booking. Partial payments need a ledger.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_booking_id_key;
CREATE INDEX IF NOT EXISTS idx_payments_booking_received_at
  ON public.payments (booking_id, received_at);

-- Limit public availability reads to anonymous clients only. Authenticated owners still read
-- through the existing "Owners can manage bookings" policy.
DROP POLICY IF EXISTS "Public can view future booking availability" ON public.bookings;
CREATE POLICY "Public can view future booking availability"
ON public.bookings FOR SELECT
TO anon
USING (date >= CURRENT_DATE AND status NOT IN ('Cancelled', 'No-show'));

-- Financial columns live on bookings for fast dashboard reads. Since bookings also has a
-- public availability policy, keep public SELECT access column-scoped to non-financial data.
REVOKE SELECT ON public.bookings FROM anon;
GRANT SELECT (
  id,
  salon_id,
  stylist_id,
  date,
  start_time,
  duration,
  status,
  source,
  created_at
) ON public.bookings TO anon;

-- Backfill billing snapshots from booking services and existing payment rows.
WITH service_totals AS (
  SELECT
    b.id AS booking_id,
    COALESCE(SUM(bs.price_at_booking * bs.qty), 0)::NUMERIC(10,2) AS subtotal
  FROM public.bookings b
  LEFT JOIN public.booking_services bs ON bs.booking_id = b.id
  GROUP BY b.id
),
payment_totals AS (
  SELECT
    booking_id,
    COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS paid,
    COALESCE(SUM(discount), 0)::NUMERIC(10,2) AS discount,
    COALESCE(SUM(tip), 0)::NUMERIC(10,2) AS tip,
    MAX(received_at) AS last_paid_at
  FROM public.payments
  GROUP BY booking_id
)
UPDATE public.bookings b
SET
  bill_subtotal = st.subtotal,
  discount_type = 'amount',
  discount_value = COALESCE(pt.discount, 0),
  discount_amount = COALESCE(pt.discount, 0),
  tip_amount = COALESCE(pt.tip, 0),
  round_off_amount = 0,
  bill_total = CASE
    WHEN COALESCE(pt.paid, 0) > 0 THEN COALESCE(pt.paid, 0)
    ELSE GREATEST(0, st.subtotal - COALESCE(pt.discount, 0) + COALESCE(pt.tip, 0))
  END,
  amount_paid = CASE
    WHEN b.status = 'Paid' AND COALESCE(pt.paid, 0) = 0 THEN GREATEST(0, st.subtotal - COALESCE(pt.discount, 0) + COALESCE(pt.tip, 0))
    ELSE COALESCE(pt.paid, 0)
  END,
  amount_due = CASE
    WHEN b.status = 'Paid' OR COALESCE(pt.paid, 0) > 0 THEN 0
    ELSE GREATEST(0, st.subtotal - COALESCE(pt.discount, 0) + COALESCE(pt.tip, 0))
  END,
  payment_status = CASE
    WHEN b.status = 'Paid' OR COALESCE(pt.paid, 0) > 0 THEN 'paid'
    WHEN b.status = 'Completed' THEN 'due'
    ELSE b.payment_status
  END,
  paid_at = CASE
    WHEN b.status = 'Paid' OR COALESCE(pt.paid, 0) > 0 THEN pt.last_paid_at
    ELSE b.paid_at
  END
FROM service_totals st
LEFT JOIN payment_totals pt ON pt.booking_id = st.booking_id
WHERE b.id = st.booking_id;

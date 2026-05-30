-- Migration to add settings persistence columns to salons and create billing_invoices table

-- 1. Add settings columns to salons table
ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS wa_settings JSONB DEFAULT '{
    "reminder": 24,
    "autoConfirm": true,
    "sendOffers": false,
    "verified": true,
    "senderPreference": "chairbook",
    "templates": {
        "confirmation": "Hi {name} 🙏 Your booking at Glow Salon is confirmed for {date} at {time} with {stylist}.",
        "reminder": "Hi {name}, reminder: {service} with {stylist} tomorrow at {time}. Reply YES to confirm.",
        "reengagement": "Hey {name}! It''s been a while. Book now and get 10% off your next visit."
    }
}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
    "newBooking": {"push": true, "sms": false, "wa": true},
    "cancel": {"push": true, "sms": false, "wa": true},
    "noshow": {"push": true, "sms": false, "wa": false},
    "daily": {"push": false, "sms": false, "wa": true}
}'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Create billing_invoices table
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS on billing_invoices
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policy for billing_invoices (Owners can view their invoices)
DROP POLICY IF EXISTS "Owners can view their invoices" ON public.billing_invoices;
CREATE POLICY "Owners can view their invoices"
ON public.billing_invoices FOR SELECT
TO authenticated
USING (public.is_org_owner(org_id));

-- 5. Grant API privileges on billing_invoices
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_invoices TO authenticated;

-- 6. Seed initial invoice records for existing organizations to show historical payments
INSERT INTO public.billing_invoices (org_id, date, plan_name, amount, payment_method)
SELECT
    o.id,
    d.invoice_date::DATE,
    CASE WHEN o.plan = 'Solo' THEN 'Solo · monthly' ELSE 'Salon · monthly' END,
    CASE WHEN o.plan = 'Solo' THEN 499.00 ELSE 999.00 END,
    CASE WHEN d.i = 1 THEN 'UPI · ravi@okhdfc' ELSE 'Card · ****4527' END
FROM public.organizations o
CROSS JOIN LATERAL (
    VALUES
        (1, CURRENT_DATE - INTERVAL '1 month'),
        (2, CURRENT_DATE - INTERVAL '2 months')
) AS d(i, invoice_date)
WHERE NOT EXISTS (
    SELECT 1 FROM public.billing_invoices bi WHERE bi.org_id = o.id
);

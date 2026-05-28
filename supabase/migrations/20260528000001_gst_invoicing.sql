-- GST Invoicing Schema
-- Adds GST settings, invoice storage, and atomic invoice number generation.

-- 1. Salon GST Settings
CREATE TABLE IF NOT EXISTS public.salon_gst_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL UNIQUE REFERENCES public.salons(id) ON DELETE CASCADE,
    gst_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    gstin VARCHAR(15),
    legal_name VARCHAR(255),
    registered_address TEXT,
    state VARCHAR(100),
    state_code VARCHAR(2),
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    sac_code VARCHAR(10) NOT NULL DEFAULT '999721',
    pricing_mode VARCHAR(20) NOT NULL DEFAULT 'tax_exclusive',
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'SAL',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salon_gst_pricing_mode_check CHECK (pricing_mode IN ('tax_inclusive', 'tax_exclusive')),
    CONSTRAINT salon_gst_rate_check CHECK (gst_rate >= 0 AND gst_rate <= 100),
    CONSTRAINT salon_gst_gstin_format CHECK (
        gstin IS NULL
        OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    )
);

-- 2. Invoice Counter (per salon, per financial year)
CREATE TABLE IF NOT EXISTS public.gst_invoice_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    financial_year VARCHAR(10) NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    UNIQUE (salon_id, financial_year)
);

-- 3. GST Invoices
CREATE TABLE IF NOT EXISTS public.gst_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    invoice_number VARCHAR(20) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    financial_year VARCHAR(10) NOT NULL,
    share_token UUID NOT NULL DEFAULT gen_random_uuid(),
    -- Salon details (snapshot at time of invoice)
    salon_legal_name VARCHAR(255) NOT NULL,
    salon_gstin VARCHAR(15) NOT NULL,
    salon_address TEXT,
    salon_state VARCHAR(100),
    salon_state_code VARCHAR(2),
    -- Customer details
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    -- Optional B2B customer details
    customer_gstin VARCHAR(15),
    customer_business_name VARCHAR(255),
    customer_billing_address TEXT,
    customer_billing_state VARCHAR(100),
    customer_billing_state_code VARCHAR(2),
    -- Tax calculation
    is_igst BOOLEAN NOT NULL DEFAULT FALSE,
    sac_code VARCHAR(10) NOT NULL DEFAULT '999721',
    taxable_amount NUMERIC(10,2) NOT NULL,
    cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 9.00,
    cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 9.00,
    sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    -- Payment
    payment_method VARCHAR(50),
    -- Delivery
    whatsapp_delivery_status VARCHAR(20) NOT NULL DEFAULT 'not_available',
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gst_invoices_wa_status_check CHECK (
        whatsapp_delivery_status IN ('not_available', 'pending', 'sent', 'delivered', 'failed')
    ),
    CONSTRAINT gst_invoices_customer_gstin_check CHECK (
        customer_gstin IS NULL
        OR customer_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    ),
    UNIQUE (salon_id, invoice_number),
    UNIQUE (share_token)
);

-- 4. GST Invoice Items (line items)
CREATE TABLE IF NOT EXISTS public.gst_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.gst_invoices(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    sac_code VARCHAR(10) NOT NULL DEFAULT '999721',
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    taxable_amount NUMERIC(10,2) NOT NULL,
    cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    CONSTRAINT gst_invoice_items_qty_check CHECK (qty > 0),
    CONSTRAINT gst_invoice_items_price_check CHECK (unit_price >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gst_invoices_salon ON public.gst_invoices(salon_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_booking ON public.gst_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_share_token ON public.gst_invoices(share_token);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_date ON public.gst_invoices(salon_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_gst_invoice_items_invoice ON public.gst_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoice_counters_salon_fy ON public.gst_invoice_counters(salon_id, financial_year);

-- ============================================================
-- Atomic invoice number generation
-- Uses advisory lock + upsert to guarantee sequential, gap-free
-- numbers per salon per financial year.
-- Format: PREFIX-YYYY-NNNNNN  e.g. SAL-2627-000001
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_gst_invoice_number(
    p_salon_id UUID,
    p_prefix VARCHAR DEFAULT 'SAL'
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fy VARCHAR(10);
    v_next INTEGER;
    v_now DATE := CURRENT_DATE;
    v_year INTEGER;
BEGIN
    -- Determine financial year: Apr-Mar cycle
    v_year := EXTRACT(YEAR FROM v_now)::INTEGER;
    IF EXTRACT(MONTH FROM v_now) < 4 THEN
        v_fy := (v_year - 1)::TEXT || RIGHT(v_year::TEXT, 2);
    ELSE
        v_fy := v_year::TEXT || RIGHT((v_year + 1)::TEXT, 2);
    END IF;
    -- Remove any dash for compact format (2026-27 -> 2627)
    v_fy := LEFT(v_fy, 2) || RIGHT(LEFT(v_fy, 4), 2) || RIGHT(v_fy, 2);

    -- Upsert counter row and atomically increment
    INSERT INTO public.gst_invoice_counters (salon_id, financial_year, last_number)
    VALUES (p_salon_id, v_fy, 1)
    ON CONFLICT (salon_id, financial_year)
    DO UPDATE SET last_number = public.gst_invoice_counters.last_number + 1
    RETURNING last_number INTO v_next;

    -- Format: SAL-2627-000001 (up to 999999, 15 chars max)
    RETURN p_prefix || '-' || v_fy || '-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;

-- ============================================================
-- Token-based invoice lookup for shareable PDF links.
-- SECURITY DEFINER bypasses RLS so unauthenticated requests
-- (via the Next.js API route) can fetch invoice data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_invoice_by_share_token(p_token UUID)
RETURNS TABLE (
    id UUID,
    salon_id UUID,
    booking_id UUID,
    invoice_number VARCHAR(20),
    invoice_date DATE,
    financial_year VARCHAR(10),
    salon_legal_name VARCHAR(255),
    salon_gstin VARCHAR(15),
    salon_address TEXT,
    salon_state VARCHAR(100),
    salon_state_code VARCHAR(2),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_gstin VARCHAR(15),
    customer_business_name VARCHAR(255),
    customer_billing_address TEXT,
    customer_billing_state VARCHAR(100),
    customer_billing_state_code VARCHAR(2),
    is_igst BOOLEAN,
    sac_code VARCHAR(10),
    taxable_amount NUMERIC(10,2),
    cgst_rate NUMERIC(5,2),
    cgst_amount NUMERIC(10,2),
    sgst_rate NUMERIC(5,2),
    sgst_amount NUMERIC(10,2),
    igst_rate NUMERIC(5,2),
    igst_amount NUMERIC(10,2),
    discount_amount NUMERIC(10,2),
    total_amount NUMERIC(10,2),
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        i.id, i.salon_id, i.booking_id,
        i.invoice_number, i.invoice_date, i.financial_year,
        i.salon_legal_name, i.salon_gstin, i.salon_address,
        i.salon_state, i.salon_state_code,
        i.customer_name, i.customer_phone,
        i.customer_gstin, i.customer_business_name,
        i.customer_billing_address, i.customer_billing_state,
        i.customer_billing_state_code,
        i.is_igst, i.sac_code,
        i.taxable_amount, i.cgst_rate, i.cgst_amount,
        i.sgst_rate, i.sgst_amount,
        i.igst_rate, i.igst_amount,
        i.discount_amount, i.total_amount,
        i.payment_method, i.created_at
    FROM public.gst_invoices i
    WHERE i.share_token = p_token;
$$;

-- Function to fetch invoice items by invoice ID (for share-token route)
CREATE OR REPLACE FUNCTION public.get_invoice_items_by_invoice_id(p_invoice_id UUID)
RETURNS TABLE (
    id UUID,
    service_name VARCHAR(255),
    sac_code VARCHAR(10),
    qty INTEGER,
    unit_price NUMERIC(10,2),
    taxable_amount NUMERIC(10,2),
    cgst_amount NUMERIC(10,2),
    sgst_amount NUMERIC(10,2),
    igst_amount NUMERIC(10,2),
    total_amount NUMERIC(10,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        it.id, it.service_name, it.sac_code, it.qty,
        it.unit_price, it.taxable_amount,
        it.cgst_amount, it.sgst_amount, it.igst_amount,
        it.total_amount
    FROM public.gst_invoice_items it
    WHERE it.invoice_id = p_invoice_id
    ORDER BY it.id;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.salon_gst_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoice_items ENABLE ROW LEVEL SECURITY;

-- salon_gst_settings
DROP POLICY IF EXISTS "Owners can manage GST settings" ON public.salon_gst_settings;
CREATE POLICY "Owners can manage GST settings"
ON public.salon_gst_settings FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

-- gst_invoice_counters
DROP POLICY IF EXISTS "Owners can manage invoice counters" ON public.gst_invoice_counters;
CREATE POLICY "Owners can manage invoice counters"
ON public.gst_invoice_counters FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

-- gst_invoices
DROP POLICY IF EXISTS "Owners can manage invoices" ON public.gst_invoices;
CREATE POLICY "Owners can manage invoices"
ON public.gst_invoices FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

-- gst_invoice_items — access via invoice ownership
CREATE OR REPLACE FUNCTION public.owns_gst_invoice(p_invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.gst_invoices inv
        WHERE inv.id = p_invoice_id
          AND public.owns_salon(inv.salon_id)
    );
$$;

DROP POLICY IF EXISTS "Owners can manage invoice items" ON public.gst_invoice_items;
CREATE POLICY "Owners can manage invoice items"
ON public.gst_invoice_items FOR ALL
TO authenticated
USING (public.owns_gst_invoice(invoice_id))
WITH CHECK (public.owns_gst_invoice(invoice_id));

-- ============================================================
-- Grants
-- ============================================================
GRANT ALL ON
    public.salon_gst_settings,
    public.gst_invoice_counters,
    public.gst_invoices,
    public.gst_invoice_items
TO authenticated;

GRANT EXECUTE ON FUNCTION public.next_gst_invoice_number(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_by_share_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_items_by_invoice_id(UUID) TO anon, authenticated;

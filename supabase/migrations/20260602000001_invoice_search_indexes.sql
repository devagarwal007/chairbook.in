-- Invoice search and pagination indexes.
-- Keeps invoice history lookups fast as GST/customer invoices and account billing rows grow.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_gst_invoices_salon_date_created
ON public.gst_invoices (salon_id, invoice_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gst_invoices_salon_wa_status_date
ON public.gst_invoices (salon_id, whatsapp_delivery_status, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_gst_invoices_salon_payment_method
ON public.gst_invoices (salon_id, payment_method);

CREATE INDEX IF NOT EXISTS idx_gst_invoices_invoice_number_trgm
ON public.gst_invoices USING gin (invoice_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_gst_invoices_customer_name_trgm
ON public.gst_invoices USING gin (customer_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_gst_invoices_customer_phone_trgm
ON public.gst_invoices USING gin (customer_phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_date_created
ON public.billing_invoices (org_id, date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_payment_method
ON public.billing_invoices (org_id, payment_method);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_plan_name_trgm
ON public.billing_invoices USING gin (plan_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_payment_method_trgm
ON public.billing_invoices USING gin (payment_method gin_trgm_ops);

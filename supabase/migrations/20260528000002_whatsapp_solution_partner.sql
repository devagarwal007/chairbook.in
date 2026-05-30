-- WhatsApp Solution Partner schema
-- Supports ChairBook-owned Meta credit line, salon-owned senders, and prepaid message credits.

CREATE TABLE IF NOT EXISTS public.whatsapp_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    mode VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    credit_line_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    waba_id TEXT,
    business_account_id TEXT,
    phone_number_id TEXT,
    display_number TEXT,
    quality_rating VARCHAR(30),
    messaging_limit_tier VARCHAR(80),
    webhook_status VARCHAR(30) NOT NULL DEFAULT 'unknown',
    last_verified_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_channels_mode_check CHECK (mode IN ('salon_owned', 'chairbook_fallback')),
    CONSTRAINT whatsapp_channels_status_check CHECK (status IN ('pending', 'active', 'inactive', 'error')),
    CONSTRAINT whatsapp_channels_credit_line_status_check CHECK (credit_line_status IN ('pending', 'active', 'missing', 'error')),
    CONSTRAINT whatsapp_channels_webhook_status_check CHECK (webhook_status IN ('unknown', 'subscribed', 'error'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_channels_salon_mode
    ON public.whatsapp_channels(salon_id, mode);
CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_salon
    ON public.whatsapp_channels(salon_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_channel_secrets (
    channel_id UUID PRIMARY KEY REFERENCES public.whatsapp_channels(id) ON DELETE CASCADE,
    encrypted_access_token TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.whatsapp_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
    template_key VARCHAR(80) NOT NULL,
    meta_template_name VARCHAR(120) NOT NULL,
    language_code VARCHAR(16) NOT NULL DEFAULT 'en',
    category VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    body_preview TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_templates_category_check CHECK (category IN ('utility', 'marketing', 'authentication', 'service')),
    CONSTRAINT whatsapp_templates_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'paused', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_templates_scope_key_lang
    ON public.whatsapp_message_templates(COALESCE(salon_id, '00000000-0000-0000-0000-000000000000'::uuid), template_key, language_code);

CREATE TABLE IF NOT EXISTS public.message_credit_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE UNIQUE,
    plan_credits INTEGER NOT NULL DEFAULT 0,
    refill_credits INTEGER NOT NULL DEFAULT 0,
    reserved_plan_credits INTEGER NOT NULL DEFAULT 0,
    reserved_refill_credits INTEGER NOT NULL DEFAULT 0,
    reset_period_start DATE,
    reset_period_end DATE,
    low_credit_notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_credit_wallets_nonnegative_check CHECK (
        plan_credits >= 0
        AND refill_credits >= 0
        AND reserved_plan_credits >= 0
        AND reserved_refill_credits >= 0
        AND reserved_plan_credits <= plan_credits
        AND reserved_refill_credits <= refill_credits
    )
);

CREATE TABLE IF NOT EXISTS public.message_credit_topups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    amount_paise INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'created',
    raw_event JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT message_credit_topups_status_check CHECK (status IN ('created', 'paid', 'failed')),
    CONSTRAINT message_credit_topups_positive_check CHECK (amount_paise > 0 AND credits > 0)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(4) NOT NULL,
    category VARCHAR(30) NOT NULL,
    credit_units INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_pricing_rules_category_check CHECK (category IN ('utility', 'marketing', 'authentication', 'service')),
    CONSTRAINT whatsapp_pricing_rules_credit_units_check CHECK (credit_units > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_pricing_rules_unique
    ON public.whatsapp_pricing_rules(country_code, category, effective_from);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.whatsapp_channels(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.gst_invoices(id) ON DELETE SET NULL,
    direction VARCHAR(20) NOT NULL,
    message_type VARCHAR(30) NOT NULL,
    template_key VARCHAR(80),
    template_category VARCHAR(30),
    to_phone TEXT,
    from_phone TEXT,
    body TEXT,
    meta_message_id TEXT UNIQUE,
    conversation_id TEXT,
    credit_units_reserved INTEGER NOT NULL DEFAULT 0,
    credit_units_consumed INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'queued',
    failure_code TEXT,
    failure_message TEXT,
    provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_messages_direction_check CHECK (direction IN ('outbound', 'inbound')),
    CONSTRAINT whatsapp_messages_type_check CHECK (message_type IN ('template', 'text', 'status')),
    CONSTRAINT whatsapp_messages_category_check CHECK (template_category IS NULL OR template_category IN ('utility', 'marketing', 'authentication', 'service')),
    CONSTRAINT whatsapp_messages_status_check CHECK (status IN ('queued', 'reserved', 'sent', 'delivered', 'read', 'failed', 'released', 'inbound'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_salon_created
    ON public.whatsapp_messages(salon_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_booking
    ON public.whatsapp_messages(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status
    ON public.whatsapp_messages(status);

CREATE TABLE IF NOT EXISTS public.message_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.message_credit_wallets(id) ON DELETE SET NULL,
    message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
    topup_id UUID REFERENCES public.message_credit_topups(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL,
    plan_credits INTEGER NOT NULL DEFAULT 0,
    refill_credits INTEGER NOT NULL DEFAULT 0,
    balance_after JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_credit_ledger_action_check CHECK (action IN ('reserve', 'consume', 'release', 'topup', 'monthly_grant')),
    CONSTRAINT message_credit_ledger_nonnegative_check CHECK (plan_credits >= 0 AND refill_credits >= 0)
);

CREATE INDEX IF NOT EXISTS idx_message_credit_ledger_salon_created
    ON public.message_credit_ledger(salon_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION public.reserve_message_credits(
    p_salon_id UUID,
    p_message_id UUID,
    p_units INTEGER,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet public.message_credit_wallets%ROWTYPE;
    v_plan_units INTEGER;
    v_refill_units INTEGER;
    v_available INTEGER;
BEGIN
    IF p_units IS NULL OR p_units <= 0 THEN
        RAISE EXCEPTION 'Credit units must be positive';
    END IF;

    INSERT INTO public.message_credit_wallets (salon_id)
    VALUES (p_salon_id)
    ON CONFLICT (salon_id) DO NOTHING;

    SELECT *
    INTO v_wallet
    FROM public.message_credit_wallets
    WHERE salon_id = p_salon_id
    FOR UPDATE;

    IF EXISTS (
        SELECT 1 FROM public.message_credit_ledger WHERE idempotency_key = p_idempotency_key
    ) THEN
        RETURN jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        );
    END IF;

    v_available := GREATEST(0, v_wallet.plan_credits - v_wallet.reserved_plan_credits)
        + GREATEST(0, v_wallet.refill_credits - v_wallet.reserved_refill_credits);

    IF v_available < p_units THEN
        RAISE EXCEPTION 'Insufficient WhatsApp credits';
    END IF;

    v_plan_units := LEAST(p_units, GREATEST(0, v_wallet.plan_credits - v_wallet.reserved_plan_credits));
    v_refill_units := p_units - v_plan_units;

    UPDATE public.message_credit_wallets
    SET
        reserved_plan_credits = reserved_plan_credits + v_plan_units,
        reserved_refill_credits = reserved_refill_credits + v_refill_units,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet.id
    RETURNING * INTO v_wallet;

    INSERT INTO public.message_credit_ledger (
        salon_id, wallet_id, message_id, action, plan_credits, refill_credits,
        balance_after, idempotency_key
    )
    VALUES (
        p_salon_id, v_wallet.id, p_message_id, 'reserve', v_plan_units, v_refill_units,
        jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        ),
        p_idempotency_key
    );

    RETURN jsonb_build_object(
        'planCredits', v_wallet.plan_credits,
        'refillCredits', v_wallet.refill_credits,
        'reservedPlanCredits', v_wallet.reserved_plan_credits,
        'reservedRefillCredits', v_wallet.reserved_refill_credits
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_reserved_message_credits(
    p_salon_id UUID,
    p_message_id UUID,
    p_units INTEGER,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet public.message_credit_wallets%ROWTYPE;
    v_plan_units INTEGER;
    v_refill_units INTEGER;
BEGIN
    IF p_units IS NULL OR p_units <= 0 THEN
        RAISE EXCEPTION 'Credit units must be positive';
    END IF;

    SELECT *
    INTO v_wallet
    FROM public.message_credit_wallets
    WHERE salon_id = p_salon_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message credit wallet not found';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.message_credit_ledger WHERE idempotency_key = p_idempotency_key
    ) THEN
        RETURN jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        );
    END IF;

    IF (v_wallet.reserved_plan_credits + v_wallet.reserved_refill_credits) < p_units THEN
        RAISE EXCEPTION 'Insufficient reserved WhatsApp credits';
    END IF;

    v_plan_units := LEAST(p_units, v_wallet.reserved_plan_credits);
    v_refill_units := p_units - v_plan_units;

    UPDATE public.message_credit_wallets
    SET
        plan_credits = plan_credits - v_plan_units,
        refill_credits = refill_credits - v_refill_units,
        reserved_plan_credits = reserved_plan_credits - v_plan_units,
        reserved_refill_credits = reserved_refill_credits - v_refill_units,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet.id
    RETURNING * INTO v_wallet;

    INSERT INTO public.message_credit_ledger (
        salon_id, wallet_id, message_id, action, plan_credits, refill_credits,
        balance_after, idempotency_key
    )
    VALUES (
        p_salon_id, v_wallet.id, p_message_id, 'consume', v_plan_units, v_refill_units,
        jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        ),
        p_idempotency_key
    );

    RETURN jsonb_build_object(
        'planCredits', v_wallet.plan_credits,
        'refillCredits', v_wallet.refill_credits,
        'reservedPlanCredits', v_wallet.reserved_plan_credits,
        'reservedRefillCredits', v_wallet.reserved_refill_credits
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_reserved_message_credits(
    p_salon_id UUID,
    p_message_id UUID,
    p_units INTEGER,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet public.message_credit_wallets%ROWTYPE;
    v_plan_units INTEGER;
    v_refill_units INTEGER;
BEGIN
    IF p_units IS NULL OR p_units <= 0 THEN
        RAISE EXCEPTION 'Credit units must be positive';
    END IF;

    SELECT *
    INTO v_wallet
    FROM public.message_credit_wallets
    WHERE salon_id = p_salon_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message credit wallet not found';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.message_credit_ledger WHERE idempotency_key = p_idempotency_key
    ) THEN
        RETURN jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        );
    END IF;

    IF (v_wallet.reserved_plan_credits + v_wallet.reserved_refill_credits) < p_units THEN
        RAISE EXCEPTION 'Insufficient reserved WhatsApp credits';
    END IF;

    v_plan_units := LEAST(p_units, v_wallet.reserved_plan_credits);
    v_refill_units := p_units - v_plan_units;

    UPDATE public.message_credit_wallets
    SET
        reserved_plan_credits = reserved_plan_credits - v_plan_units,
        reserved_refill_credits = reserved_refill_credits - v_refill_units,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet.id
    RETURNING * INTO v_wallet;

    INSERT INTO public.message_credit_ledger (
        salon_id, wallet_id, message_id, action, plan_credits, refill_credits,
        balance_after, idempotency_key
    )
    VALUES (
        p_salon_id, v_wallet.id, p_message_id, 'release', v_plan_units, v_refill_units,
        jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        ),
        p_idempotency_key
    );

    RETURN jsonb_build_object(
        'planCredits', v_wallet.plan_credits,
        'refillCredits', v_wallet.refill_credits,
        'reservedPlanCredits', v_wallet.reserved_plan_credits,
        'reservedRefillCredits', v_wallet.reserved_refill_credits
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_message_credit_topup(
    p_salon_id UUID,
    p_topup_id UUID,
    p_credits INTEGER,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet public.message_credit_wallets%ROWTYPE;
BEGIN
    IF p_credits IS NULL OR p_credits <= 0 THEN
        RAISE EXCEPTION 'Credit units must be positive';
    END IF;

    INSERT INTO public.message_credit_wallets (salon_id)
    VALUES (p_salon_id)
    ON CONFLICT (salon_id) DO NOTHING;

    SELECT *
    INTO v_wallet
    FROM public.message_credit_wallets
    WHERE salon_id = p_salon_id
    FOR UPDATE;

    IF EXISTS (
        SELECT 1 FROM public.message_credit_ledger WHERE idempotency_key = p_idempotency_key
    ) THEN
        RETURN jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        );
    END IF;

    UPDATE public.message_credit_wallets
    SET
        refill_credits = refill_credits + p_credits,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet.id
    RETURNING * INTO v_wallet;

    INSERT INTO public.message_credit_ledger (
        salon_id, wallet_id, topup_id, action, plan_credits, refill_credits,
        balance_after, idempotency_key
    )
    VALUES (
        p_salon_id, v_wallet.id, p_topup_id, 'topup', 0, p_credits,
        jsonb_build_object(
            'planCredits', v_wallet.plan_credits,
            'refillCredits', v_wallet.refill_credits,
            'reservedPlanCredits', v_wallet.reserved_plan_credits,
            'reservedRefillCredits', v_wallet.reserved_refill_credits
        ),
        p_idempotency_key
    );

    RETURN jsonb_build_object(
        'planCredits', v_wallet.plan_credits,
        'refillCredits', v_wallet.refill_credits,
        'reservedPlanCredits', v_wallet.reserved_plan_credits,
        'reservedRefillCredits', v_wallet.reserved_refill_credits
    );
END;
$$;

ALTER TABLE public.whatsapp_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_channel_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_credit_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view whatsapp channels" ON public.whatsapp_channels;
CREATE POLICY "Owners can view whatsapp channels"
ON public.whatsapp_channels FOR SELECT
TO authenticated
USING (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can view whatsapp templates" ON public.whatsapp_message_templates;
CREATE POLICY "Owners can view whatsapp templates"
ON public.whatsapp_message_templates FOR SELECT
TO authenticated
USING (salon_id IS NULL OR public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can view message credit wallets" ON public.message_credit_wallets;
CREATE POLICY "Owners can view message credit wallets"
ON public.message_credit_wallets FOR SELECT
TO authenticated
USING (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can view credit topups" ON public.message_credit_topups;
CREATE POLICY "Owners can view credit topups"
ON public.message_credit_topups FOR SELECT
TO authenticated
USING (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Authenticated can view whatsapp pricing rules" ON public.whatsapp_pricing_rules;
CREATE POLICY "Authenticated can view whatsapp pricing rules"
ON public.whatsapp_pricing_rules FOR SELECT
TO authenticated
USING (active = TRUE);

DROP POLICY IF EXISTS "Owners can view whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Owners can view whatsapp messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated
USING (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can view credit ledger" ON public.message_credit_ledger;
CREATE POLICY "Owners can view credit ledger"
ON public.message_credit_ledger FOR SELECT
TO authenticated
USING (public.owns_salon(salon_id));

GRANT SELECT ON
    public.whatsapp_channels,
    public.whatsapp_message_templates,
    public.message_credit_wallets,
    public.message_credit_topups,
    public.whatsapp_pricing_rules,
    public.whatsapp_messages,
    public.message_credit_ledger
TO authenticated;

-- No authenticated grants are given to whatsapp_channel_secrets or webhook_events.
-- These are service-role only operational tables.

GRANT ALL ON
    public.whatsapp_channels,
    public.whatsapp_channel_secrets,
    public.whatsapp_message_templates,
    public.message_credit_wallets,
    public.message_credit_topups,
    public.whatsapp_pricing_rules,
    public.whatsapp_messages,
    public.message_credit_ledger,
    public.whatsapp_webhook_events
TO service_role;

GRANT EXECUTE ON FUNCTION public.reserve_message_credits(UUID, UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_reserved_message_credits(UUID, UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_reserved_message_credits(UUID, UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_message_credit_topup(UUID, UUID, INTEGER, TEXT) TO service_role;

INSERT INTO public.whatsapp_pricing_rules (country_code, category, credit_units)
VALUES
    ('91', 'utility', 1),
    ('91', 'authentication', 1),
    ('91', 'service', 1),
    ('91', 'marketing', 2)
ON CONFLICT (country_code, category, effective_from) DO NOTHING;

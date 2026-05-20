-- ChairBook Database Initialization Schema
-- Supports multi-salon and multi-branch hierarchy.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'Salon',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT organizations_plan_check CHECK (plan IN ('Solo', 'Salon', 'Chain'))
);

-- 2. Users / profiles linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (role IN ('owner', 'manager', 'stylist'))
);

-- 3. Salons / branches
CREATE TABLE IF NOT EXISTS public.salons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    area VARCHAR(100),
    city VARCHAR(100),
    type VARCHAR(50),
    hours JSONB,
    wa_number VARCHAR(20),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salons_slug_format_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- 4. Stylists
CREATE TABLE IF NOT EXISTS public.stylists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role_label VARCHAR(100),
    commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    tone VARCHAR(20) NOT NULL DEFAULT 'tone-a',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stylists_commission_check CHECK (commission_pct >= 0 AND commission_pct <= 100)
);

-- 5. Services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    duration_min INTEGER NOT NULL DEFAULT 30,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT services_duration_check CHECK (duration_min > 0),
    CONSTRAINT services_price_check CHECK (price >= 0)
);

-- 6. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pref_stylist_id UUID REFERENCES public.stylists(id) ON DELETE SET NULL,
    birthday DATE,
    member_since DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customers_phone_salon_unique UNIQUE (salon_id, phone)
);

-- 7. Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    stylist_id UUID REFERENCES public.stylists(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
    source VARCHAR(50) NOT NULL DEFAULT 'Web',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_duration_check CHECK (duration > 0),
    CONSTRAINT bookings_status_check CHECK (status IN ('Pending', 'Confirmed', 'Arrived', 'Completed', 'Paid', 'No-show', 'Cancelled')),
    CONSTRAINT bookings_source_check CHECK (source IN ('WhatsApp', 'Manual', 'Web'))
);

-- Prevent two active bookings from occupying the same stylist slot.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'bookings_no_stylist_overlap'
          AND conrelid = 'public.bookings'::regclass
    ) THEN
        ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_no_stylist_overlap
        EXCLUDE USING gist (
            stylist_id WITH =,
            tsrange(
                date + start_time,
                date + start_time + (duration * INTERVAL '1 minute'),
                '[)'
            ) WITH &&
        )
        WHERE (stylist_id IS NOT NULL AND status NOT IN ('Cancelled', 'No-show'));
    END IF;
END $$;

-- 8. Booking services
CREATE TABLE IF NOT EXISTS public.booking_services (
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL DEFAULT 1,
    price_at_booking NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (booking_id, service_id),
    CONSTRAINT booking_services_qty_check CHECK (qty > 0),
    CONSTRAINT booking_services_price_check CHECK (price_at_booking >= 0)
);

-- 9. Payments / POS checkout
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    tip NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_method_check CHECK (method IN ('UPI', 'Cash', 'Card')),
    CONSTRAINT payments_amount_check CHECK (amount >= 0),
    CONSTRAINT payments_tip_check CHECK (tip >= 0),
    CONSTRAINT payments_discount_check CHECK (discount >= 0),
    CONSTRAINT payments_tax_check CHECK (tax >= 0)
);

-- 10. Stylist / salon block time
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    stylist_id UUID REFERENCES public.stylists(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    date_from DATE NOT NULL,
    date_to DATE,
    time_from TIME,
    time_to TIME,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT blocks_date_order_check CHECK (date_to IS NULL OR date_to >= date_from),
    CONSTRAINT blocks_time_order_check CHECK (time_to IS NULL OR time_from IS NULL OR time_to > time_from)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(org_id);
CREATE INDEX IF NOT EXISTS idx_salons_org ON public.salons(org_id);
CREATE INDEX IF NOT EXISTS idx_salons_slug ON public.salons(slug);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_date ON public.bookings(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_stylist_date ON public.bookings(stylist_id, date);
CREATE INDEX IF NOT EXISTS idx_customers_salon_phone ON public.customers(salon_id, phone);
CREATE INDEX IF NOT EXISTS idx_services_salon ON public.services(salon_id);
CREATE INDEX IF NOT EXISTS idx_stylists_salon ON public.stylists(salon_id);
CREATE INDEX IF NOT EXISTS idx_blocks_salon_date ON public.blocks(salon_id, date_from, date_to);

-- Ownership helpers for RLS policies.
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = p_org_id
          AND o.owner_user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_salon(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.salons s
        JOIN public.organizations o ON o.id = s.org_id
        WHERE s.id = p_salon_id
          AND o.owner_user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_booking(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id = p_booking_id
          AND public.owns_salon(b.salon_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, name, email, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1), 'Salon owner'),
        COALESCE(NEW.email, NEW.id::text || '@auth.local'),
        NULL,
        'owner'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- Public booking RPC. This keeps customer creation and booking writes off the anon table API.
CREATE OR REPLACE FUNCTION public.create_public_booking(
    p_salon_id UUID,
    p_customer_name TEXT,
    p_phone TEXT,
    p_stylist_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration INTEGER,
    p_service_ids UUID[]
)
RETURNS TABLE (booking_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_booking_id UUID;
    v_service_count INTEGER;
BEGIN
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
        RAISE EXCEPTION 'Customer name is required';
    END IF;

    IF p_phone IS NULL OR length(trim(p_phone)) < 10 THEN
        RAISE EXCEPTION 'Valid phone number is required';
    END IF;

    IF p_duration IS NULL OR p_duration <= 0 THEN
        RAISE EXCEPTION 'Booking duration must be positive';
    END IF;

    IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one service is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.salons WHERE id = p_salon_id) THEN
        RAISE EXCEPTION 'Salon not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.stylists
        WHERE id = p_stylist_id
          AND salon_id = p_salon_id
          AND active = TRUE
    ) THEN
        RAISE EXCEPTION 'Stylist is not available';
    END IF;

    SELECT count(*)
    INTO v_service_count
    FROM public.services
    WHERE salon_id = p_salon_id
      AND active = TRUE
      AND id = ANY(p_service_ids);

    IF v_service_count <> array_length(p_service_ids, 1) THEN
        RAISE EXCEPTION 'One or more services are invalid';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.stylist_id = p_stylist_id
          AND b.date = p_date
          AND b.status NOT IN ('Cancelled', 'No-show')
          AND tsrange(b.date + b.start_time, b.date + b.start_time + (b.duration * INTERVAL '1 minute'), '[)')
              && tsrange(p_date + p_start_time, p_date + p_start_time + (p_duration * INTERVAL '1 minute'), '[)')
    ) THEN
        RAISE EXCEPTION 'That slot is no longer available';
    END IF;

    INSERT INTO public.customers (salon_id, name, phone, pref_stylist_id)
    VALUES (p_salon_id, trim(p_customer_name), trim(p_phone), p_stylist_id)
    ON CONFLICT (salon_id, phone)
    DO UPDATE SET
        name = EXCLUDED.name,
        pref_stylist_id = EXCLUDED.pref_stylist_id
    RETURNING id INTO v_customer_id;

    INSERT INTO public.bookings (salon_id, customer_id, stylist_id, date, start_time, duration, status, source)
    VALUES (p_salon_id, v_customer_id, p_stylist_id, p_date, p_start_time, p_duration, 'Confirmed', 'Web')
    RETURNING id INTO v_booking_id;

    INSERT INTO public.booking_services (booking_id, service_id, qty, price_at_booking)
    SELECT v_booking_id, s.id, 1, s.price
    FROM public.services s
    WHERE s.id = ANY(p_service_ids)
      AND s.salon_id = p_salon_id;

    RETURN QUERY SELECT v_booking_id;
END;
$$;

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their organizations" ON public.organizations;
CREATE POLICY "Owners can view their organizations"
ON public.organizations FOR SELECT
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
CREATE POLICY "Owners can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
CREATE POLICY "Owners can update their organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view allowed profiles" ON public.users;
CREATE POLICY "Users can view allowed profiles"
ON public.users FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_org_owner(org_id));

DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Public can view salon booking pages" ON public.salons;
CREATE POLICY "Public can view salon booking pages"
ON public.salons FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Owners can manage salons" ON public.salons;
CREATE POLICY "Owners can manage salons"
ON public.salons FOR ALL
TO authenticated
USING (public.is_org_owner(org_id))
WITH CHECK (public.is_org_owner(org_id));

DROP POLICY IF EXISTS "Public can view active stylists" ON public.stylists;
CREATE POLICY "Public can view active stylists"
ON public.stylists FOR SELECT
USING (active = TRUE OR public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can manage stylists" ON public.stylists;
CREATE POLICY "Owners can manage stylists"
ON public.stylists FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services"
ON public.services FOR SELECT
USING (active = TRUE OR public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can manage services" ON public.services;
CREATE POLICY "Owners can manage services"
ON public.services FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can manage customers" ON public.customers;
CREATE POLICY "Owners can manage customers"
ON public.customers FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Public can view future booking availability" ON public.bookings;
CREATE POLICY "Public can view future booking availability"
ON public.bookings FOR SELECT
USING (
    public.owns_salon(salon_id)
    OR (date >= CURRENT_DATE AND status NOT IN ('Cancelled', 'No-show'))
);

DROP POLICY IF EXISTS "Owners can manage bookings" ON public.bookings;
CREATE POLICY "Owners can manage bookings"
ON public.bookings FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

DROP POLICY IF EXISTS "Owners can manage booking services" ON public.booking_services;
CREATE POLICY "Owners can manage booking services"
ON public.booking_services FOR ALL
TO authenticated
USING (public.owns_booking(booking_id))
WITH CHECK (public.owns_booking(booking_id));

DROP POLICY IF EXISTS "Owners can manage payments" ON public.payments;
CREATE POLICY "Owners can manage payments"
ON public.payments FOR ALL
TO authenticated
USING (public.owns_booking(booking_id))
WITH CHECK (public.owns_booking(booking_id));

DROP POLICY IF EXISTS "Owners can manage blocks" ON public.blocks;
CREATE POLICY "Owners can manage blocks"
ON public.blocks FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

-- API privileges. RLS policies above decide which rows are visible/editable.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.salons, public.stylists, public.services, public.bookings TO anon;
GRANT ALL ON
    public.organizations,
    public.users,
    public.salons,
    public.stylists,
    public.services,
    public.customers,
    public.bookings,
    public.booking_services,
    public.payments,
    public.blocks
TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_booking(UUID, TEXT, TEXT, UUID, DATE, TIME, INTEGER, UUID[]) TO anon, authenticated;

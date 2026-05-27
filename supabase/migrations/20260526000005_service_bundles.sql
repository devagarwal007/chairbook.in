-- Service codes and bundle services.
-- Bundles are represented as rows in public.services so existing booking,
-- checkout, and revenue flows keep using booking_services.service_id.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS code INTEGER,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS bundle_note TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_kind_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_kind_check
  CHECK (kind IN ('service', 'bundle'));

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_code_positive_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_code_positive_check
  CHECK (code IS NULL OR code > 0);

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY salon_id
      ORDER BY created_at, name, id
    ) AS next_code
  FROM public.services
  WHERE kind = 'service'
    AND code IS NULL
)
UPDATE public.services s
SET code = ranked.next_code
FROM ranked
WHERE s.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_services_salon_service_code
  ON public.services(salon_id, code)
  WHERE kind = 'service' AND code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_salon_kind_active
  ON public.services(salon_id, kind, active)
  WHERE deleted_at IS NULL;

ALTER TABLE public.booking_services
  DROP CONSTRAINT IF EXISTS booking_services_service_id_fkey;

ALTER TABLE public.booking_services
  ADD CONSTRAINT booking_services_service_id_fkey
  FOREIGN KEY (service_id)
  REFERENCES public.services(id)
  ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.bundle_components (
  bundle_service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  component_service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bundle_service_id, component_service_id),
  CONSTRAINT bundle_components_not_self_check CHECK (bundle_service_id <> component_service_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_components_component
  ON public.bundle_components(component_service_id);

ALTER TABLE public.bundle_components ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.assign_service_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind = 'bundle' THEN
    NEW.code := NULL;
    RETURN NEW;
  END IF;

  IF NEW.code IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.salon_id::text, 0));
    SELECT COALESCE(MAX(code), 0) + 1
    INTO NEW.code
    FROM public.services
    WHERE salon_id = NEW.salon_id
      AND kind = 'service';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_service_code_before_write ON public.services;
CREATE TRIGGER assign_service_code_before_write
BEFORE INSERT OR UPDATE OF salon_id, kind, code ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.assign_service_code();

CREATE OR REPLACE FUNCTION public.guard_bundle_component()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bundle public.services%ROWTYPE;
  v_component public.services%ROWTYPE;
BEGIN
  SELECT * INTO v_bundle
  FROM public.services
  WHERE id = NEW.bundle_service_id;

  SELECT * INTO v_component
  FROM public.services
  WHERE id = NEW.component_service_id;

  IF v_bundle.id IS NULL OR v_bundle.kind <> 'bundle' OR v_bundle.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bundle component parent must be a bundle service';
  END IF;

  IF v_component.id IS NULL OR v_component.kind <> 'service' OR v_component.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bundle components must be normal services';
  END IF;

  IF v_bundle.salon_id <> v_component.salon_id THEN
    RAISE EXCEPTION 'Bundle components must belong to the same salon';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_bundle_component_before_write ON public.bundle_components;
CREATE TRIGGER guard_bundle_component_before_write
BEFORE INSERT OR UPDATE ON public.bundle_components
FOR EACH ROW
EXECUTE FUNCTION public.guard_bundle_component();

CREATE OR REPLACE FUNCTION public.hide_invalid_bundles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.services b
  SET active = FALSE
  WHERE b.kind = 'bundle'
    AND b.active = TRUE
    AND b.deleted_at IS NULL
    AND b.id IN (
      SELECT bc.bundle_service_id
      FROM public.bundle_components bc
      LEFT JOIN public.services s
        ON s.id = bc.component_service_id
       AND s.kind = 'service'
       AND s.active = TRUE
       AND s.deleted_at IS NULL
      WHERE bc.bundle_service_id = b.id
      GROUP BY bc.bundle_service_id
      HAVING count(s.id) < 2
    );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS hide_invalid_bundles_after_component_change ON public.bundle_components;
CREATE TRIGGER hide_invalid_bundles_after_component_change
AFTER INSERT OR UPDATE OR DELETE ON public.bundle_components
FOR EACH STATEMENT
EXECUTE FUNCTION public.hide_invalid_bundles();

DROP TRIGGER IF EXISTS hide_invalid_bundles_after_service_change ON public.services;
CREATE TRIGGER hide_invalid_bundles_after_service_change
AFTER UPDATE OF active, kind ON public.services
FOR EACH STATEMENT
EXECUTE FUNCTION public.hide_invalid_bundles();

DROP POLICY IF EXISTS "Owners can manage bundle components" ON public.bundle_components;
CREATE POLICY "Owners can manage bundle components"
ON public.bundle_components FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.services b
    WHERE b.id = bundle_service_id
      AND public.owns_salon(b.salon_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.services b
    JOIN public.services c ON c.id = component_service_id
    WHERE b.id = bundle_service_id
      AND b.salon_id = c.salon_id
      AND public.owns_salon(b.salon_id)
  )
);

DROP POLICY IF EXISTS "Public can view active bundle components" ON public.bundle_components;
CREATE POLICY "Public can view active bundle components"
ON public.bundle_components FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.services b
    JOIN public.services c ON c.id = component_service_id
    WHERE b.id = bundle_service_id
      AND b.salon_id = c.salon_id
      AND (
        public.owns_salon(b.salon_id)
        OR (
          b.active = TRUE
          AND c.active = TRUE
          AND b.deleted_at IS NULL
          AND c.deleted_at IS NULL
        )
      )
  )
);

DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services"
ON public.services FOR SELECT
USING ((active = TRUE AND deleted_at IS NULL) OR public.owns_salon(salon_id));

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
    FROM public.services s
    WHERE s.salon_id = p_salon_id
      AND s.active = TRUE
      AND s.deleted_at IS NULL
      AND s.id = ANY(p_service_ids)
      AND (
        s.kind = 'service'
        OR (
          s.kind = 'bundle'
          AND (
            SELECT count(*)
            FROM public.bundle_components bc
            JOIN public.services component
              ON component.id = bc.component_service_id
             AND component.kind = 'service'
             AND component.active = TRUE
             AND component.deleted_at IS NULL
             AND component.salon_id = s.salon_id
            WHERE bc.bundle_service_id = s.id
          ) >= 2
        )
      );

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
      AND s.salon_id = p_salon_id
      AND s.deleted_at IS NULL;

    RETURN QUERY SELECT v_booking_id;
END;
$$;

GRANT SELECT ON public.bundle_components TO anon;
GRANT ALL ON public.bundle_components TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_service_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_bundle_component() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_invalid_bundles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_booking(UUID, TEXT, TEXT, UUID, DATE, TIME, INTEGER, UUID[]) TO anon, authenticated;

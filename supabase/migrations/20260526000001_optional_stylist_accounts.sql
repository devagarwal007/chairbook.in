-- Optional stylist login accounts.
-- Stylist rows remain valid without user_id/email; account access is attached only when owners invite a stylist.

ALTER TABLE public.stylists
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS specialisations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS stylist_id UUID REFERENCES public.stylists(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stylists_user_id ON public.stylists(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stylists_email ON public.stylists(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stylists_booking_slug ON public.stylists(booking_slug) WHERE booking_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_stylist ON public.notifications(stylist_id, created_at DESC) WHERE stylist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON public.booking_services(booking_id);

CREATE OR REPLACE FUNCTION public.current_stylist_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.stylists s
  WHERE s.user_id = (SELECT auth.uid())
    AND s.active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_stylist_for_salon(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stylists s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.salon_id = p_salon_id
      AND s.active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.stylist_owns_booking(p_booking_id UUID)
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
      AND b.stylist_id = public.current_stylist_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_stylist_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.owns_salon(OLD.salon_id) THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS NOT NULL AND OLD.user_id = (SELECT auth.uid()) THEN
    IF NEW.salon_id IS DISTINCT FROM OLD.salon_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
      OR NEW.tone IS DISTINCT FROM OLD.tone
      OR NEW.active IS DISTINCT FROM OLD.active
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Stylists can only update their public profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_stylist_self_update ON public.stylists;
CREATE TRIGGER guard_stylist_self_update
BEFORE UPDATE ON public.stylists
FOR EACH ROW
EXECUTE FUNCTION public.guard_stylist_self_update();

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
      OR NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
      RAISE EXCEPTION 'Stylists can only update status and appointment notes';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_stylist_booking_update ON public.bookings;
CREATE TRIGGER guard_stylist_booking_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.guard_stylist_booking_update();

CREATE OR REPLACE FUNCTION public.guard_stylist_notification_update()
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
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.salon_id IS DISTINCT FROM OLD.salon_id
      OR NEW.stylist_id IS DISTINCT FROM OLD.stylist_id
      OR NEW.type IS DISTINCT FROM OLD.type
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.body IS DISTINCT FROM OLD.body
      OR NEW.meta IS DISTINCT FROM OLD.meta
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Stylists can only mark notifications read or unread';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_stylist_notification_update ON public.notifications;
CREATE TRIGGER guard_stylist_notification_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.guard_stylist_notification_update();

DROP POLICY IF EXISTS "Public can view active stylists" ON public.stylists;
CREATE POLICY "Public can view active stylists"
ON public.stylists FOR SELECT
TO anon
USING (active = TRUE);

DROP POLICY IF EXISTS "Stylists can view own profile" ON public.stylists;
CREATE POLICY "Stylists can view own profile"
ON public.stylists FOR SELECT
TO authenticated
USING (
  public.owns_salon(salon_id)
  OR user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Stylists can update own profile" ON public.stylists;
CREATE POLICY "Stylists can update own profile"
ON public.stylists FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Stylists can view own bookings" ON public.bookings;
CREATE POLICY "Stylists can view own bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (stylist_id = public.current_stylist_id());

DROP POLICY IF EXISTS "Stylists can update own booking status" ON public.bookings;
CREATE POLICY "Stylists can update own booking status"
ON public.bookings FOR UPDATE
TO authenticated
USING (stylist_id = public.current_stylist_id())
WITH CHECK (stylist_id = public.current_stylist_id());

DROP POLICY IF EXISTS "Stylists can view own booking services" ON public.booking_services;
CREATE POLICY "Stylists can view own booking services"
ON public.booking_services FOR SELECT
TO authenticated
USING (public.stylist_owns_booking(booking_id));

DROP POLICY IF EXISTS "Stylists can view own booked customers" ON public.customers;
CREATE POLICY "Stylists can view own booked customers"
ON public.customers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.customer_id = customers.id
      AND b.stylist_id = public.current_stylist_id()
  )
);

DROP POLICY IF EXISTS "Stylists can view own salon services" ON public.services;
CREATE POLICY "Stylists can view own salon services"
ON public.services FOR SELECT
TO authenticated
USING (
  active = TRUE
  AND public.is_current_stylist_for_salon(salon_id)
);

DROP POLICY IF EXISTS "Stylists can view own blocks" ON public.blocks;
CREATE POLICY "Stylists can view own blocks"
ON public.blocks FOR SELECT
TO authenticated
USING (
  stylist_id = public.current_stylist_id()
  OR (stylist_id IS NULL AND public.is_current_stylist_for_salon(salon_id))
);

DROP POLICY IF EXISTS "Stylists can view own notifications" ON public.notifications;
CREATE POLICY "Stylists can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (stylist_id = public.current_stylist_id());

DROP POLICY IF EXISTS "Stylists can mark own notifications read" ON public.notifications;
CREATE POLICY "Stylists can mark own notifications read"
ON public.notifications FOR UPDATE
TO authenticated
USING (stylist_id = public.current_stylist_id())
WITH CHECK (stylist_id = public.current_stylist_id());

-- Keep public booking pages from seeing account linkage fields.
REVOKE SELECT ON public.stylists FROM anon;
GRANT SELECT (
  id,
  salon_id,
  name,
  role_label,
  tone,
  active,
  specialisations,
  photo_url,
  booking_slug,
  created_at
) ON public.stylists TO anon;

-- Authenticated users still use RLS policies above; owners need management access.
GRANT ALL ON public.stylists TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_stylist_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_stylist_for_salon(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stylist_owns_booking(UUID) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('stylist-photos', 'stylist-photos', true)
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Public Access on stylist-photos'
    ) THEN
      CREATE POLICY "Public Access on stylist-photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'stylist-photos');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Stylists can upload own photos'
    ) THEN
      CREATE POLICY "Stylists can upload own photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'stylist-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Stylists can update own photos'
    ) THEN
      CREATE POLICY "Stylists can update own photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'stylist-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
      )
      WITH CHECK (
        bucket_id = 'stylist-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Stylists can delete own photos'
    ) THEN
      CREATE POLICY "Stylists can delete own photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'stylist-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
      );
    END IF;
  END IF;
END $$;

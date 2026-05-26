-- Track stylist account lifecycle separately from the optional auth link.
-- user_id means the account is linked/invited; account_accepted_at means the stylist completed setup.

ALTER TABLE public.stylists
  ADD COLUMN IF NOT EXISTS account_invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_accepted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_stylists_account_accepted
  ON public.stylists(account_accepted_at)
  WHERE user_id IS NOT NULL;

-- Backfill already-accepted linked stylist accounts from Supabase Auth.
UPDATE public.stylists s
SET account_accepted_at = COALESCE(au.email_confirmed_at, au.last_sign_in_at),
    account_invited_at = COALESCE(s.account_invited_at, s.created_at)
FROM auth.users au
WHERE s.user_id = au.id
  AND s.account_accepted_at IS NULL
  AND COALESCE(au.email_confirmed_at, au.last_sign_in_at) IS NOT NULL;

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
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.account_invited_at IS DISTINCT FROM OLD.account_invited_at THEN
      RAISE EXCEPTION 'Stylists can only update their public profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

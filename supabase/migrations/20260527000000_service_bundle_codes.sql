-- Give bundles the same salon-wide service-code sequence as normal services.

DROP TRIGGER IF EXISTS assign_service_code_before_write ON public.services;

WITH salon_max AS (
  SELECT salon_id, COALESCE(MAX(code), 0) AS max_code
  FROM public.services
  WHERE deleted_at IS NULL
  GROUP BY salon_id
),
missing AS (
  SELECT
    s.id,
    salon_max.max_code + row_number() OVER (
      PARTITION BY s.salon_id
      ORDER BY s.created_at, s.name, s.id
    ) AS next_code
  FROM public.services s
  JOIN salon_max ON salon_max.salon_id = s.salon_id
  WHERE s.deleted_at IS NULL
    AND s.code IS NULL
)
UPDATE public.services s
SET code = missing.next_code
FROM missing
WHERE s.id = missing.id;

DROP INDEX IF EXISTS public.idx_services_salon_service_code;
DROP INDEX IF EXISTS public.idx_services_salon_code;

CREATE UNIQUE INDEX idx_services_salon_code
  ON public.services(salon_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.assign_service_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.salon_id::text, 0));
    SELECT COALESCE(MAX(code), 0) + 1
    INTO NEW.code
    FROM public.services
    WHERE salon_id = NEW.salon_id
      AND deleted_at IS NULL
      AND id <> NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_service_code_before_write
BEFORE INSERT OR UPDATE OF salon_id, kind, code ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.assign_service_code();

GRANT EXECUTE ON FUNCTION public.assign_service_code() TO authenticated;

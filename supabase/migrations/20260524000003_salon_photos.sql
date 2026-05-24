-- Migration to add photos array column to salons and setup supabase storage bucket

-- 1. Add photos column
ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}'::text[];

-- 2. Create supabase storage bucket if storage schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('salon-photos', 'salon-photos', true)
        ON CONFLICT (id) DO NOTHING;

        -- Create RLS policies for storage objects if they don't already exist
        -- Policy for public read
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Public Access on salon-photos' AND tablename = 'objects' AND schemaname = 'storage'
        ) THEN
            CREATE POLICY "Public Access on salon-photos"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'salon-photos');
        END IF;

        -- Policy for authenticated insert
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Insert on salon-photos' AND tablename = 'objects' AND schemaname = 'storage'
        ) THEN
            CREATE POLICY "Authenticated Insert on salon-photos"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'salon-photos');
        END IF;

        -- Policy for authenticated delete
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Delete on salon-photos' AND tablename = 'objects' AND schemaname = 'storage'
        ) THEN
            CREATE POLICY "Authenticated Delete on salon-photos"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (bucket_id = 'salon-photos');
        END IF;
    END IF;
END $$;

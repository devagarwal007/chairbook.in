-- Make phone column nullable on customers table
ALTER TABLE public.customers ALTER COLUMN phone DROP NOT NULL;

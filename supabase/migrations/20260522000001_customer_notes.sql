-- Add notes JSONB column to customers table for storing customer-specific notes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes_new JSONB DEFAULT '[]'::jsonb;

-- Each note object: { "id": uuid, "date": timestamp, "author": text, "text": text }
COMMENT ON COLUMN customers.notes_new IS 'Array of note objects: [{id, date, author, text}]';

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_type_check CHECK (type IN ('new_booking', 'walk_in', 'status_update', 'cancellation', 'reschedule', 'payment', 'daily_summary'))
);

-- Create broadcasts table
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    template_text TEXT NOT NULL,
    audience_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT broadcasts_status_check CHECK (status IN ('Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_salon ON public.notifications(salon_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_salon ON public.broadcasts(salon_id);
CREATE INDEX IF NOT EXISTS idx_customers_notes ON public.customers USING gin (notes_new) WHERE notes_new IS NOT NULL;

-- Add booking source values needed by dashboard + walk-in
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_source_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_source_check 
    CHECK (source IN ('WhatsApp', 'Manual', 'Web', 'Dashboard', 'Walk-in'));

-- Enable RLS on new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
DROP POLICY IF EXISTS "Owners can manage notifications" ON public.notifications;
CREATE POLICY "Owners can manage notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

-- RLS policies for broadcasts
DROP POLICY IF EXISTS "Owners can manage broadcasts" ON public.broadcasts;
CREATE POLICY "Owners can manage broadcasts"
ON public.broadcasts FOR ALL
TO authenticated
USING (public.owns_salon(salon_id))
WITH CHECK (public.owns_salon(salon_id));

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.broadcasts TO authenticated;

-- Follow-up for databases where attendance_v1 was already applied before
-- attendance correction notifications were allowed through RLS.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_booking', 'walk_in', 'status_update', 'cancellation', 'reschedule',
    'payment', 'daily_summary', 'attendance_correction'
  ));

DROP POLICY IF EXISTS "Stylists can create attendance correction notifications" ON public.notifications;
CREATE POLICY "Stylists can create attendance correction notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  type = 'attendance_correction'
  AND stylist_id IS NULL
  AND public.is_current_stylist_for_salon(salon_id)
  AND (meta ->> 'stylist_id') = public.current_stylist_id()::text
);

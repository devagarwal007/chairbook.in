-- ═══════════════════════════════════════════════════════════════
-- ChairBook V1: Time & Attendance
-- ═══════════════════════════════════════════════════════════════

-- Helper: check if current user is a stylist in a given salon
CREATE OR REPLACE FUNCTION public.is_current_stylist_for_salon(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stylists
    WHERE salon_id = p_salon_id
      AND user_id = (SELECT auth.uid())
      AND active = true
  );
$$;

-- Extend notification feed for attendance correction alerts
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

-- ═══ attendance_settings ═══
CREATE TABLE attendance_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id                 UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  is_enabled               BOOLEAN NOT NULL DEFAULT false,
  allow_stylist_clock       BOOLEAN NOT NULL DEFAULT true,
  early_clock_in_minutes    INTEGER NOT NULL DEFAULT 15,
  late_threshold_minutes    INTEGER NOT NULL DEFAULT 10,
  allow_admin_edit          BOOLEAN NOT NULL DEFAULT true,
  require_edit_reason       BOOLEAN NOT NULL DEFAULT true,
  allow_correction_request  BOOLEAN NOT NULL DEFAULT true,
  enable_break_tracking     BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attendance_settings_salon UNIQUE (salon_id)
);

ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_settings_owner_all"   ON attendance_settings FOR ALL   USING (owns_salon(salon_id));
CREATE POLICY "att_settings_stylist_read" ON attendance_settings FOR SELECT USING (is_current_stylist_for_salon(salon_id));

-- ═══ attendance_sessions ═══
CREATE TABLE attendance_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id              UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  stylist_id            UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  session_date          DATE NOT NULL,
  clock_in_at           TIMESTAMPTZ,
  clock_out_at          TIMESTAMPTZ,
  scheduled_start       TIME,
  scheduled_end         TIME,
  total_worked_minutes  INTEGER NOT NULL DEFAULT 0,
  total_break_minutes   INTEGER NOT NULL DEFAULT 0,
  paid_minutes          INTEGER NOT NULL DEFAULT 0,
  status                VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'closed', 'needs_review')),
  is_late               BOOLEAN NOT NULL DEFAULT false,
  is_absent             BOOLEAN NOT NULL DEFAULT false,
  admin_note            TEXT,
  clocked_in_by         UUID REFERENCES users(id),
  clocked_out_by        UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attendance_session UNIQUE (salon_id, stylist_id, session_date)
);

CREATE INDEX idx_att_sessions_salon_date ON attendance_sessions(salon_id, session_date);
CREATE INDEX idx_att_sessions_stylist    ON attendance_sessions(stylist_id, session_date);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_sess_owner_all"       ON attendance_sessions FOR ALL    USING (owns_salon(salon_id));
CREATE POLICY "att_sess_stylist_select"  ON attendance_sessions FOR SELECT USING (stylist_id = current_stylist_id());
CREATE POLICY "att_sess_stylist_insert"  ON attendance_sessions FOR INSERT WITH CHECK (stylist_id = current_stylist_id());
CREATE POLICY "att_sess_stylist_update"  ON attendance_sessions FOR UPDATE USING (stylist_id = current_stylist_id());

-- ═══ attendance_breaks ═══
CREATE TABLE attendance_breaks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  salon_id          UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  break_start       TIMESTAMPTZ NOT NULL,
  break_end         TIMESTAMPTZ,
  duration_minutes  INTEGER,
  is_paid           BOOLEAN NOT NULL DEFAULT false,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_att_breaks_session ON attendance_breaks(session_id);

ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_brk_owner_all"    ON attendance_breaks FOR ALL USING (owns_salon(salon_id));
CREATE POLICY "att_brk_stylist_all"  ON attendance_breaks FOR ALL USING (
  session_id IN (SELECT id FROM attendance_sessions WHERE stylist_id = current_stylist_id())
);

-- ═══ attendance_audit_log (IMMUTABLE — INSERT + SELECT only) ═══
CREATE TABLE attendance_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id        UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE RESTRICT,
  edited_by       UUID NOT NULL REFERENCES users(id),
  editor_name     VARCHAR(255),
  field_changed   TEXT NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  reason          TEXT NOT NULL,
  action_type     VARCHAR(50) NOT NULL
                  CHECK (action_type IN (
                    'manual_clock_in', 'manual_clock_out',
                    'edit_clock_in', 'edit_clock_out',
                    'add_break', 'edit_break', 'delete_break',
                    'mark_absent', 'mark_present',
                    'add_note', 'edit_note',
                    'approve_correction', 'reject_correction'
                  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_att_audit_session ON attendance_audit_log(session_id);
CREATE INDEX idx_att_audit_salon   ON attendance_audit_log(salon_id, created_at);

ALTER TABLE attendance_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_audit_owner_read"   ON attendance_audit_log FOR SELECT USING (owns_salon(salon_id));
CREATE POLICY "att_audit_member_insert" ON attendance_audit_log FOR INSERT WITH CHECK (
  owns_salon(salon_id) OR is_current_stylist_for_salon(salon_id)
);
-- ⛔ NO UPDATE or DELETE policy = immutable audit trail

-- ═══ correction_requests ═══
CREATE TABLE correction_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id               UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  session_id             UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  stylist_id             UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  requested_clock_in     TIMESTAMPTZ,
  requested_clock_out    TIMESTAMPTZ,
  break_corrections      JSONB,
  reason                 TEXT NOT NULL,
  status                 VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by            UUID REFERENCES users(id),
  reviewed_at            TIMESTAMPTZ,
  rejection_reason       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_corr_req_salon   ON correction_requests(salon_id, status);
CREATE INDEX idx_corr_req_session ON correction_requests(session_id);

ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corr_req_owner_all"       ON correction_requests FOR ALL    USING (owns_salon(salon_id));
CREATE POLICY "corr_req_stylist_select"  ON correction_requests FOR SELECT USING (stylist_id = current_stylist_id());
CREATE POLICY "corr_req_stylist_insert"  ON correction_requests FOR INSERT WITH CHECK (stylist_id = current_stylist_id());

-- ═══ Alter blocks table — add counts_as column ═══
ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS counts_as VARCHAR(30) NOT NULL DEFAULT 'service_unavailable'
  CHECK (counts_as IN ('service_unavailable','paid_break','unpaid_break','training','leave_absent'));

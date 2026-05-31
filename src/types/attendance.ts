// ═══ Attendance Display Statuses ═══
export type AttendanceDisplayStatus =
  | "not_clocked_in"
  | "working"
  | "on_break"
  | "clocked_out"
  | "late"
  | "absent"
  | "missed_clock_out"
  | "needs_review";

// ═══ DB session status (column constraint) ═══
export type AttendanceSessionStatus = "open" | "closed" | "needs_review";

// ═══ Correction request status ═══
export type CorrectionRequestStatus = "pending" | "approved" | "rejected";

// ═══ Audit action types (matches DB CHECK constraint) ═══
export type AttendanceAuditAction =
  | "manual_clock_in" | "manual_clock_out"
  | "edit_clock_in" | "edit_clock_out"
  | "add_break" | "edit_break" | "delete_break"
  | "mark_absent" | "mark_present"
  | "add_note" | "edit_note"
  | "approve_correction" | "reject_correction";

// ═══ Block counts_as (for blocks table ALTER) ═══
export type BlockCountsAs =
  | "service_unavailable"
  | "paid_break"
  | "unpaid_break"
  | "training"
  | "leave_absent";

// ═══ Attendance Settings ═══
export interface AttendanceSettings {
  id: string;
  salon_id: string;
  is_enabled: boolean;
  allow_stylist_clock: boolean;
  early_clock_in_minutes: number;
  late_threshold_minutes: number;
  allow_admin_edit: boolean;
  require_edit_reason: boolean;
  allow_correction_request: boolean;
  enable_break_tracking: boolean;
}

// ═══ Attendance Session ═══
export interface AttendanceSession {
  id: string;
  salon_id: string;
  stylist_id: string;
  session_date: string; // YYYY-MM-DD
  clock_in_at: string | null;
  clock_out_at: string | null;
  scheduled_start: string | null; // HH:MM
  scheduled_end: string | null;   // HH:MM
  total_worked_minutes: number;
  total_break_minutes: number;
  paid_minutes: number;
  status: AttendanceSessionStatus;
  is_late: boolean;
  is_absent: boolean;
  admin_note: string | null;
  clocked_in_by: string | null;
  clocked_out_by: string | null;
  created_at: string;
  updated_at: string;
}

// ═══ Attendance Break ═══
export interface AttendanceBreak {
  id: string;
  session_id: string;
  salon_id: string;
  break_start: string;
  break_end: string | null;
  duration_minutes: number | null;
  is_paid: boolean;
  created_by: string | null;
  created_at: string;
}

// ═══ Audit Log Entry ═══
export interface AttendanceAuditEntry {
  id: string;
  salon_id: string;
  session_id: string;
  edited_by: string;
  editor_name: string | null;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  action_type: AttendanceAuditAction;
  created_at: string;
}

// ═══ Correction Request ═══
export interface CorrectionRequest {
  id: string;
  salon_id: string;
  session_id: string;
  stylist_id: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  break_corrections: unknown; // JSONB
  reason: string;
  status: CorrectionRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

// ═══ UI Display Types ═══
export interface AttendanceStylistRow {
  stylistId: string;
  stylistName: string;
  initials: string;
  tone: string;
  displayStatus: AttendanceDisplayStatus;
  clockInAt: string | null;
  clockOutAt: string | null;
  workedMinutes: number;
  breakMinutes: number;
  isLate: boolean;
  sessionId: string | null;
  hasPendingCorrection: boolean;
}

export interface MyShiftData {
  session: AttendanceSession | null;
  breaks: AttendanceBreak[];
  settings: AttendanceSettings | null;
  displayStatus: AttendanceDisplayStatus;
  scheduledStart: string | null; // "10:00"
  scheduledEnd: string | null;   // "20:00"
  isSalonOpenToday: boolean;
}

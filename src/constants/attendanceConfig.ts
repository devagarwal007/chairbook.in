import type { AttendanceDisplayStatus, BlockCountsAs } from "@/types";

// ═══ Status Display Config ═══
export const ATTENDANCE_STATUS_CONFIG: Record<AttendanceDisplayStatus, {
  label: string;
  color: string; // Tailwind class prefix
  dotColor: string; // CSS var or hex
}> = {
  not_clocked_in: { label: "Not Clocked In", color: "ink-soft", dotColor: "var(--ink-soft)" },
  working:        { label: "Working",        color: "teal",     dotColor: "var(--teal)" },
  on_break:       { label: "On Break",       color: "amber",    dotColor: "var(--amber)" },
  clocked_out:    { label: "Clocked Out",    color: "blue",     dotColor: "#3182CE" },
  late:           { label: "Late",           color: "amber",    dotColor: "var(--amber)" },
  absent:         { label: "Absent",         color: "danger",   dotColor: "var(--danger)" },
  missed_clock_out: { label: "Missed Clock-Out", color: "danger", dotColor: "var(--danger)" },
  needs_review:   { label: "Needs Review",   color: "amber",    dotColor: "var(--amber)" },
};

// ═══ Block Time "Counts As" Options ═══
export const BLOCK_COUNTS_AS_OPTIONS: { id: BlockCountsAs; label: string }[] = [
  { id: "service_unavailable", label: "No attendance impact (default)" },
  { id: "paid_break",         label: "Paid break" },
  { id: "unpaid_break",       label: "Unpaid break" },
  { id: "training",           label: "Training (paid)" },
  { id: "leave_absent",       label: "Leave / Absent" },
];

// ═══ Default Settings ═══
export const DEFAULT_ATTENDANCE_SETTINGS = {
  is_enabled: false,
  allow_stylist_clock: true,
  early_clock_in_minutes: 15,
  late_threshold_minutes: 10,
  allow_admin_edit: true,
  require_edit_reason: true,
  allow_correction_request: true,
  enable_break_tracking: true,
};

// ═══ Mock Data (for when Supabase is unavailable) ═══
export const MOCK_ATTENDANCE_SESSION = {
  id: "preview-att-1",
  salon_id: "preview-salon",
  stylist_id: "preview-stylist",
  session_date: new Date().toISOString().slice(0, 10),
  clock_in_at: new Date(new Date().setHours(10, 3, 0, 0)).toISOString(),
  clock_out_at: null,
  scheduled_start: "10:00",
  scheduled_end: "20:00",
  total_worked_minutes: 0,
  total_break_minutes: 0,
  paid_minutes: 0,
  status: "open" as const,
  is_late: false,
  is_absent: false,
  admin_note: null,
  clocked_in_by: null,
  clocked_out_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_ATTENDANCE_BREAKS = [
  {
    id: "preview-brk-1",
    session_id: "preview-att-1",
    salon_id: "preview-salon",
    break_start: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
    break_end: new Date(new Date().setHours(13, 30, 0, 0)).toISOString(),
    duration_minutes: 30,
    is_paid: false,
    created_by: null,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_ATTENDANCE_SETTINGS = {
  id: "preview-settings",
  salon_id: "preview-salon",
  ...DEFAULT_ATTENDANCE_SETTINGS,
  is_enabled: true,
};

export const MOCK_ADMIN_ATTENDANCE_ROWS = [
  { stylistId: "s1", stylistName: "Anjali Sharma", initials: "AS", tone: "b", displayStatus: "working" as const,       clockInAt: new Date(new Date().setHours(10, 3)).toISOString(), clockOutAt: null, workedMinutes: 272, breakMinutes: 30, isLate: false, sessionId: "att-1", hasPendingCorrection: false },
  { stylistId: "s2", stylistName: "Rahul Kapoor",  initials: "RK", tone: "c", displayStatus: "on_break" as const,      clockInAt: new Date(new Date().setHours(10, 15)).toISOString(), clockOutAt: null, workedMinutes: 260, breakMinutes: 15, isLate: true,  sessionId: "att-2", hasPendingCorrection: false },
  { stylistId: "s3", stylistName: "Meera Desai",   initials: "MD", tone: "d", displayStatus: "not_clocked_in" as const, clockInAt: null, clockOutAt: null, workedMinutes: 0,   breakMinutes: 0,  isLate: false, sessionId: null,   hasPendingCorrection: false },
  { stylistId: "s4", stylistName: "Arjun Patel",   initials: "AP", tone: "e", displayStatus: "absent" as const,         clockInAt: null, clockOutAt: null, workedMinutes: 0,   breakMinutes: 0,  isLate: false, sessionId: "att-4", hasPendingCorrection: false },
  { stylistId: "s5", stylistName: "Sneha Reddy",   initials: "SR", tone: "a", displayStatus: "clocked_out" as const,    clockInAt: new Date(new Date().setHours(10, 0)).toISOString(), clockOutAt: new Date(new Date().setHours(18, 0)).toISOString(), workedMinutes: 450, breakMinutes: 30, isLate: false, sessionId: "att-5", hasPendingCorrection: true },
];

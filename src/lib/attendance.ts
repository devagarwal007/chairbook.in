import type { AttendanceDisplayStatus, AttendanceSession, AttendanceBreak, AttendanceSessionStatus, BlockCountsAs, NotificationPayload } from "@/types";
import type { HoursData } from "@/types";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Get today's scheduled shift from salon hours */
export function getScheduledShift(hours: HoursData | null, date?: Date): {
  start: string | null; end: string | null; isOpen: boolean;
} {
  if (!hours) return { start: null, end: null, isOpen: true };
  const d = date || new Date();
  const dayKey = DAY_KEYS[d.getDay()];
  const day = hours[dayKey];
  if (!day || !day.open) return { start: null, end: null, isOpen: false };
  return { start: day.from, end: day.to, isOpen: true };
}

/** Compute display status from session + breaks */
export function computeDisplayStatus(
  session: AttendanceSession | null,
  activeBreak: AttendanceBreak | null,
): AttendanceDisplayStatus {
  if (!session) return "not_clocked_in";
  if (session.is_absent) return "absent";
  if (session.status === "needs_review") return "needs_review";
  if (session.status === "closed") return "clocked_out";
  // status === "open"
  if (!session.clock_in_at) return "not_clocked_in";
  if (session.clock_out_at) return "clocked_out";
  if (activeBreak) return "on_break";
  if (session.is_late) return "late"; // can also show "working" with late badge
  return "working";
}

/** Calculate total worked minutes from session, subtracting breaks */
export function computeWorkedMinutes(
  clockInAt: string | null,
  clockOutAt: string | null,
  totalBreakMinutes: number,
): number {
  if (!clockInAt) return 0;
  const end = clockOutAt ? new Date(clockOutAt) : new Date();
  const start = new Date(clockInAt);
  const totalMs = end.getTime() - start.getTime();
  const totalMinutes = Math.max(0, Math.round(totalMs / 60000));
  return Math.max(0, totalMinutes - totalBreakMinutes);
}

export function validateChronologicalRange(
  startIso: string | null,
  endIso: string | null,
): string | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid time";
  }
  return end.getTime() > start.getTime() ? null : "End time must be after start time";
}

export function buildIndiaTimestamp(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00+05:30`;
}

export function minutesBetween(startIso: string | null, endIso: string | null): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return 0;
  }
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function calculateAttendanceTotals(
  clockInAt: string | null,
  clockOutAt: string | null,
  breaks: Array<Pick<AttendanceBreak, "duration_minutes" | "is_paid">>,
): {
  totalBreakMinutes: number;
  totalWorkedMinutes: number;
  paidMinutes: number;
} {
  const totalSessionMinutes = minutesBetween(clockInAt, clockOutAt);
  const totalBreakMinutes = breaks.reduce((sum, item) => sum + Math.max(0, item.duration_minutes || 0), 0);
  const unpaidBreakMinutes = breaks.reduce(
    (sum, item) => sum + (item.is_paid ? 0 : Math.max(0, item.duration_minutes || 0)),
    0,
  );

  return {
    totalBreakMinutes,
    totalWorkedMinutes: Math.max(0, totalSessionMinutes - totalBreakMinutes),
    paidMinutes: Math.max(0, totalSessionMinutes - unpaidBreakMinutes),
  };
}

export function buildAttendanceCorrectionNotification(
  salonId: string,
  stylistId: string,
  sessionId: string,
): NotificationPayload {
  return {
    salon_id: salonId,
    stylist_id: null,
    type: "attendance_correction",
    title: "Attendance Correction Requested",
    body: "A stylist submitted a shift correction request.",
    meta: {
      session_id: sessionId,
      stylist_id: stylistId,
      actor: { name: "Stylist", initials: "ST", tone: "amber" },
      link: "/dashboard/attendance",
    },
  };
}

export interface AbsentSessionDraftInput {
  salonId: string;
  stylistIds: string[];
  dateFrom: string;
  dateTo?: string | null;
  countsAs?: BlockCountsAs | string | null;
  userId?: string | null;
}

export interface AbsentSessionDraft {
  salon_id: string;
  stylist_id: string;
  session_date: string;
  is_absent: true;
  status: AttendanceSessionStatus;
  total_worked_minutes: number;
  total_break_minutes: number;
  paid_minutes: number;
  admin_note: string;
  clocked_in_by: string | null;
}

function expandDateRange(dateFrom: string, dateTo?: string | null): string[] {
  const start = new Date(`${dateFrom}T12:00:00`);
  const end = new Date(`${dateTo || dateFrom}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const dates: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

export function buildAbsentSessionDrafts(input: AbsentSessionDraftInput): AbsentSessionDraft[] {
  if (input.countsAs !== "leave_absent") return [];
  const dates = expandDateRange(input.dateFrom, input.dateTo);

  return input.stylistIds.flatMap((stylistId) =>
    dates.map((sessionDate) => ({
      salon_id: input.salonId,
      stylist_id: stylistId,
      session_date: sessionDate,
      is_absent: true,
      status: "closed",
      total_worked_minutes: 0,
      total_break_minutes: 0,
      paid_minutes: 0,
      admin_note: "Marked absent from block time",
      clocked_in_by: input.userId || null,
    })),
  );
}

/** Check if clock-in time makes the stylist late */
export function isClockInLate(
  clockInAt: Date,
  scheduledStart: string | null,
  lateThreshold: number,
): boolean {
  if (!scheduledStart) return false;
  const [h, m] = scheduledStart.split(":").map(Number);
  const scheduled = new Date(clockInAt);
  scheduled.setHours(h, m, 0, 0);
  const diffMs = clockInAt.getTime() - scheduled.getTime();
  return diffMs > lateThreshold * 60 * 1000;
}

/** Check if it's too early to clock in */
export function isTooEarlyToClockIn(
  now: Date,
  scheduledStart: string | null,
  earlyBuffer: number,
): boolean {
  if (!scheduledStart) return false; // no schedule = always allow
  const [h, m] = scheduledStart.split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(h, m, 0, 0);
  const diffMs = scheduled.getTime() - now.getTime();
  return diffMs > earlyBuffer * 60 * 1000;
}

/** Format minutes to "Xh Ym" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format date as "Mon, 30 May" */
export function formatShiftDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/** Today's date as YYYY-MM-DD */
export function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Generate CSV content from attendance data */
export function generateAttendanceCSV(
  rows: Array<{
    name: string; date: string; clockIn: string; clockOut: string;
    worked: string; breaks: string; paid: string; status: string; note: string;
  }>,
): string {
  const header = "Name,Date,Clock In,Clock Out,Worked,Breaks,Paid Hours,Status,Note";
  const body = rows.map(r =>
    [r.name, r.date, r.clockIn, r.clockOut, r.worked, r.breaks, r.paid, r.status, `"${(r.note || "").replace(/"/g, '""')}"`].join(",")
  );
  return [header, ...body].join("\n");
}

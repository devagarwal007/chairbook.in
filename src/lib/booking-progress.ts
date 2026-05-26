import type { BookingProgressAction, BookingStatus, BookingTimingFields } from "@/types";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_service: "In Service",
  completed: "Completed",
  noshow: "No-show",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_DB: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_service: "In Service",
  completed: "Completed",
  noshow: "No-show",
  cancelled: "Cancelled",
};

export const PROGRESS_ACTION_LABEL: Record<BookingProgressAction, string> = {
  mark_arrived: "Mark Arrived",
  start_service: "Start Service",
  complete_service: "Complete",
};

export const PROGRESS_ACTION_NEXT_STATUS: Record<BookingProgressAction, BookingStatus> = {
  mark_arrived: "arrived",
  start_service: "in_service",
  complete_service: "completed",
};

export function mapDbStatusToUiStatus(status: string): BookingStatus {
  const lower = (status || "").toLowerCase();
  if (lower === "arrived") return "arrived";
  if (lower === "in service" || lower === "in_service") return "in_service";
  if (lower === "completed" || lower === "paid") return "completed";
  if (lower === "no-show" || lower === "noshow") return "noshow";
  if (lower === "cancelled" || lower === "canceled") return "cancelled";
  return "confirmed";
}

export function getNextProgressAction(status: BookingStatus): BookingProgressAction | null {
  if (status === "confirmed") return "mark_arrived";
  if (status === "arrived") return "start_service";
  if (status === "in_service") return "complete_service";
  return null;
}

export function getNextProgressStatus(status: BookingStatus): BookingStatus | null {
  const action = getNextProgressAction(status);
  return action ? PROGRESS_ACTION_NEXT_STATUS[action] : null;
}

export function minutesBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

export function getActualServiceMinutes(timing: BookingTimingFields): number | null {
  return timing.actualDurationMinutes ?? minutesBetween(timing.startedAt, timing.completedAt);
}

export function getWaitMinutes(timing: BookingTimingFields): number | null {
  return minutesBetween(timing.arrivedAt, timing.startedAt);
}

export function getUserTimeZone(fallback = "Asia/Kolkata") {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function formatZonedTimestamp(value?: string | null, fallback = "Asia/Kolkata") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: getUserTimeZone(fallback),
  }).format(date);
}

export function getBookingEndMinute(time: string, duration: number) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0) + duration;
}

export function isRunningLate(status: BookingStatus, time: string, duration: number, nowMinute: number) {
  return ["confirmed", "arrived", "in_service"].includes(status) && nowMinute > getBookingEndMinute(time, duration);
}

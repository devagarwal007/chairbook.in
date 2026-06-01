export const MIN_BOOKING_WINDOW_DAYS = 1;
export const MAX_BOOKING_WINDOW_DAYS = 365;
export const DEFAULT_BOOKING_WINDOW_DAYS = 7;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface BookingDateOption {
  key: string;
  dow: string;
  monthShort: string;
  dom: number;
  label: string | null;
  full: string;
  dayKey: string;
}

export function normalizeBookingWindowDays(value: unknown, fallback = DEFAULT_BOOKING_WINDOW_DAYS): number {
  const numeric = value === "" || value === null || value === undefined ? Number.NaN : Number(value);
  const fallbackNumeric = Number.isFinite(Number(fallback)) ? Math.trunc(Number(fallback)) : DEFAULT_BOOKING_WINDOW_DAYS;
  const candidate = Number.isFinite(numeric) ? Math.trunc(numeric) : fallbackNumeric;

  return Math.min(MAX_BOOKING_WINDOW_DAYS, Math.max(MIN_BOOKING_WINDOW_DAYS, candidate));
}

export function generateBookingDateOptions(baseDate: Date = new Date(), windowDays?: unknown): BookingDateOption[] {
  const days = normalizeBookingWindowDays(windowDays);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(baseDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(baseDate.getDate() + index);

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      dow: date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase(),
      monthShort: date.toLocaleDateString("en-IN", { month: "short" }).slice(0, 3).toUpperCase(),
      dom: date.getDate(),
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : null,
      full: date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
      dayKey: DAY_KEYS[date.getDay()],
    };
  });
}

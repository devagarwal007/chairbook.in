import { BookingStatus } from "@/types";

/**
 * Utility helper functions for ChairBook Salon CRM.
 * Follows DRY principles to avoid duplicate functions across dashboard pages.
 */

/**
 * Converts a time string (e.g. "13:30") to minutes since midnight.
 */
export const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Converts hours and minutes to minutes since midnight.
 */
export const toMinHours = (h: number, m: number): number => {
  return h * 60 + m;
};

/**
 * Extracts the initials (up to 2 characters) from a given name.
 */
export const initialsOf = (name: string): string => {
  if (!name) return "WC";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "WC";
};

/**
 * Formats a Date object into a 'YYYY-MM-DD' string key.
 */
export const formatDateKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Checks if a string is a valid UUID.
 */
export const isUUID = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Formats a time string (e.g. "13:30") to 12-hour format (e.g. "1:30 PM").
 */
export const formatTime12h = (timeStr: string): string => {
  const min = toMin(timeStr);
  return formatTime12hFromMin(min);
};

/**
 * Formats minutes since midnight to 12-hour format (e.g. "1:30 PM").
 */
export const formatTime12hFromMin = (min: number): string => {
  let h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
};

/**
 * Formats a Date object into a readable display string for the dashboard.
 */
export const formatDateDisplay = (date: Date): string => {
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const dayNum = String(date.getDate()).padStart(2, "0");
  const monthName = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${dayName} · ${dayNum} ${monthName} ${year} · ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

/**
 * Normalizes a phone number to standard +91 E.164-like format.
 */
export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
};

/**
 * Maps DB booking status string to the UI-compatible BookingStatus type.
 */
export const mapDbStatusToUi = (s: string): BookingStatus => {
  const lower = (s || "").toLowerCase();
  if (lower === "confirmed") return "confirmed";
  if (lower === "arrived") return "arrived";
  if (lower === "completed" || lower === "paid") return "completed";
  if (lower === "no-show") return "noshow";
  if (lower === "cancelled") return "cancelled";
  return "confirmed";
};

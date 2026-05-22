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

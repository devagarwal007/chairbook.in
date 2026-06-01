import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOKING_WINDOW_DAYS,
  MAX_BOOKING_WINDOW_DAYS,
  MIN_BOOKING_WINDOW_DAYS,
  generateBookingDateOptions,
  normalizeBookingWindowDays,
} from "./booking-window";

describe("normalizeBookingWindowDays", () => {
  it("defaults missing and invalid values to the default booking window", () => {
    expect(normalizeBookingWindowDays(null)).toBe(DEFAULT_BOOKING_WINDOW_DAYS);
    expect(normalizeBookingWindowDays(undefined)).toBe(DEFAULT_BOOKING_WINDOW_DAYS);
    expect(normalizeBookingWindowDays("")).toBe(DEFAULT_BOOKING_WINDOW_DAYS);
    expect(normalizeBookingWindowDays("not-a-number")).toBe(DEFAULT_BOOKING_WINDOW_DAYS);
  });

  it("keeps the booking window within the supported 1 to 365 day range", () => {
    expect(normalizeBookingWindowDays(0)).toBe(MIN_BOOKING_WINDOW_DAYS);
    expect(normalizeBookingWindowDays(-4)).toBe(MIN_BOOKING_WINDOW_DAYS);
    expect(normalizeBookingWindowDays(366)).toBe(MAX_BOOKING_WINDOW_DAYS);
    expect(normalizeBookingWindowDays(999)).toBe(MAX_BOOKING_WINDOW_DAYS);
  });

  it("accepts numeric strings and whole-day values", () => {
    expect(normalizeBookingWindowDays("30")).toBe(30);
    expect(normalizeBookingWindowDays(45.8)).toBe(45);
  });
});

describe("generateBookingDateOptions", () => {
  it("returns today through N minus 1 days ahead", () => {
    const dates = generateBookingDateOptions(new Date(2026, 1, 28), 3);

    expect(dates.map((date) => date.key)).toEqual([
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
    expect(dates.map((date) => date.label)).toEqual(["Today", "Tomorrow", null]);
    expect(dates.map((date) => date.dayKey)).toEqual(["sat", "sun", "mon"]);
    expect(dates.map((date) => date.monthShort)).toEqual(["FEB", "MAR", "MAR"]);
  });

  it("uses the default seven selectable dates when no window is configured", () => {
    const dates = generateBookingDateOptions(new Date(2026, 5, 1), undefined);

    expect(dates).toHaveLength(DEFAULT_BOOKING_WINDOW_DAYS);
    expect(dates[0]?.key).toBe("2026-06-01");
    expect(dates[6]?.key).toBe("2026-06-07");
  });
});

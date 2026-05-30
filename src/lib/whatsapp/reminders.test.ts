import { describe, expect, it } from "vitest";
import { isReminderDue } from "./reminders";

describe("WhatsApp reminder scheduling", () => {
  it("marks a booking due when the configured reminder time is inside the send window", () => {
    expect(isReminderDue({
      bookingDate: "2026-05-29",
      bookingTime: "16:00",
      reminderHours: 24,
      now: new Date("2026-05-28T10:32:00.000Z"),
      timezoneOffsetMinutes: 330,
      sendWindowMinutes: 15,
    })).toBe(true);
  });

  it("does not mark future reminders due before the send window opens", () => {
    expect(isReminderDue({
      bookingDate: "2026-05-29",
      bookingTime: "16:00",
      reminderHours: 24,
      now: new Date("2026-05-28T10:00:00.000Z"),
      timezoneOffsetMinutes: 330,
      sendWindowMinutes: 15,
    })).toBe(false);
  });
});

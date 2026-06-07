import { describe, expect, it } from "vitest";
import { getNotificationTypeFilter } from "./notification-filters";

describe("getNotificationTypeFilter", () => {
  it("includes normalized and legacy booking notification type names", () => {
    expect(getNotificationTypeFilter("bookings")).toEqual([
      "new_booking",
      "walk_in",
      "status_update",
      "confirmed",
      "rescheduled",
      "reschedule",
      "cancelled",
      "cancellation",
    ]);
  });

  it("returns null for filters that do not map to notification types", () => {
    expect(getNotificationTypeFilter("all")).toBeNull();
    expect(getNotificationTypeFilter("unread")).toBeNull();
  });
});

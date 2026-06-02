import { describe, expect, it } from "vitest";
import { describeNotificationError } from "./notification-errors";
import {
  mapDbNotificationToItem,
  normalizeNotificationKind,
  resolveNotificationLink,
} from "./notification-routing";

describe("notification helpers", () => {
  it("formats Supabase errors without dumping empty objects", () => {
    expect(
      describeNotificationError({
        code: "42501",
        message: "new row violates row-level security policy",
      })
    ).toBe("new row violates row-level security policy (42501)");

    expect(describeNotificationError({})).toBe("Unknown notification insert error");
  });

  it("normalizes database notification types to inbox kinds", () => {
    expect(normalizeNotificationKind("reschedule")).toBe("rescheduled");
    expect(normalizeNotificationKind("cancellation")).toBe("cancelled");
    expect(normalizeNotificationKind("daily_summary")).toBe("daily");
    expect(normalizeNotificationKind("new_booking")).toBe("new_booking");
  });

  it("resolves booking notifications to the booking detail page when a booking id exists", () => {
    expect(resolveNotificationLink("new_booking", { booking_id: "booking-123" })).toBe("/dashboard/bookings/booking-123");
    expect(resolveNotificationLink("reschedule", { booking_id: "booking-123" })).toBe("/dashboard/bookings/booking-123");
    expect(resolveNotificationLink("cancellation", { booking_id: "booking-123" })).toBe("/dashboard/bookings/booking-123");
    expect(resolveNotificationLink("status_update", { booking_id: "booking-123" })).toBe("/dashboard/bookings/booking-123");
  });

  it("resolves payment notifications to checkout receipt context when a booking id exists", () => {
    expect(resolveNotificationLink("payment", { booking_id: "booking-123" })).toBe("/dashboard/checkout/booking-123");
  });

  it("falls back to safe category pages when identifiers are missing", () => {
    expect(resolveNotificationLink("payment", {})).toBe("/dashboard/revenue");
    expect(resolveNotificationLink("daily_summary", {})).toBe("/dashboard");
    expect(resolveNotificationLink("attendance_correction", {})).toBe("/dashboard/attendance");
    expect(resolveNotificationLink("walk_in", {})).toBe("/dashboard/bookings");
  });

  it("uses only allowlisted internal meta links", () => {
    expect(resolveNotificationLink("daily_summary", { link: "/dashboard/settings" })).toBe("/dashboard/settings");
    expect(resolveNotificationLink("daily_summary", { link: "https://evil.example/phish" })).toBe("/dashboard");
    expect(resolveNotificationLink("daily_summary", { link: "//evil.example/phish" })).toBe("/dashboard");
    expect(resolveNotificationLink("daily_summary", { link: "/api/auth/signout" })).toBe("/dashboard");
    expect(resolveNotificationLink("daily_summary", { link: "/dashboardevil" })).toBe("/dashboard");
    expect(resolveNotificationLink("daily_summary", { link: "/dashboard/../api/auth/signout" })).toBe("/dashboard");
    expect(resolveNotificationLink("daily_summary", { link: "/dashboard/%2e%2e/api/auth/signout" })).toBe("/dashboard");
  });

  it("maps database notifications with normalized kind, detail link, actor, and display time", () => {
    const item = mapDbNotificationToItem(
      {
        id: "notif-1",
        created_at: "2026-06-02T08:30:00.000Z",
        type: "reschedule",
        title: "Booking rescheduled",
        body: "Priya moved to 4 PM",
        read: false,
        meta: {
          booking_id: "booking-123",
          actor: { name: "Priya Sharma", initials: "PS", tone: "b" },
        },
      },
      0,
      new Date("2026-06-02T12:00:00.000Z"),
    );

    expect(item).toEqual({
      id: 1,
      dbId: "notif-1",
      kind: "rescheduled",
      ts: "2:00 PM",
      day: "Today",
      unread: true,
      title: "Booking rescheduled",
      meta: "Priya moved to 4 PM",
      actor: { name: "Priya Sharma", initials: "PS", tone: "b" },
      link: "/dashboard/bookings/booking-123",
    });
  });
});

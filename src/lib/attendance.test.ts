import { describe, expect, it } from "vitest";
import {
  buildAbsentSessionDrafts,
  buildAttendanceCorrectionNotification,
  calculateAttendanceTotals,
  validateChronologicalRange,
} from "./attendance";

describe("attendance helpers", () => {
  it("rejects equal or backwards time ranges", () => {
    expect(validateChronologicalRange("2026-05-30T10:00:00+05:30", "2026-05-30T10:00:00+05:30")).toBe(
      "End time must be after start time"
    );
    expect(validateChronologicalRange("2026-05-30T11:00:00+05:30", "2026-05-30T10:00:00+05:30")).toBe(
      "End time must be after start time"
    );
    expect(validateChronologicalRange("2026-05-30T10:00:00+05:30", "2026-05-30T11:00:00+05:30")).toBeNull();
  });

  it("calculates worked and paid minutes from paid and unpaid breaks", () => {
    expect(
      calculateAttendanceTotals("2026-05-30T10:00:00+05:30", "2026-05-30T18:00:00+05:30", [
        { duration_minutes: 30, is_paid: false },
        { duration_minutes: 15, is_paid: true },
      ])
    ).toEqual({
      totalBreakMinutes: 45,
      totalWorkedMinutes: 435,
      paidMinutes: 450,
    });
  });

  it("builds notification payloads that match the existing notifications schema", () => {
    expect(buildAttendanceCorrectionNotification("salon-1", "stylist-1", "session-1")).toEqual({
      salon_id: "salon-1",
      stylist_id: null,
      type: "attendance_correction",
      title: "Attendance Correction Requested",
      body: "A stylist submitted a shift correction request.",
      meta: {
        session_id: "session-1",
        stylist_id: "stylist-1",
        actor: { name: "Stylist", initials: "ST", tone: "amber" },
        link: "/dashboard/attendance",
      },
    });
  });

  it("creates absent session drafts for leave blocks across selected stylists and dates", () => {
    expect(
      buildAbsentSessionDrafts({
        salonId: "salon-1",
        stylistIds: ["stylist-1", "stylist-2"],
        dateFrom: "2026-05-30",
        dateTo: "2026-05-31",
        countsAs: "leave_absent",
        userId: "owner-1",
      })
    ).toEqual([
      {
        salon_id: "salon-1",
        stylist_id: "stylist-1",
        session_date: "2026-05-30",
        is_absent: true,
        status: "closed",
        total_worked_minutes: 0,
        total_break_minutes: 0,
        paid_minutes: 0,
        admin_note: "Marked absent from block time",
        clocked_in_by: "owner-1",
      },
      {
        salon_id: "salon-1",
        stylist_id: "stylist-1",
        session_date: "2026-05-31",
        is_absent: true,
        status: "closed",
        total_worked_minutes: 0,
        total_break_minutes: 0,
        paid_minutes: 0,
        admin_note: "Marked absent from block time",
        clocked_in_by: "owner-1",
      },
      {
        salon_id: "salon-1",
        stylist_id: "stylist-2",
        session_date: "2026-05-30",
        is_absent: true,
        status: "closed",
        total_worked_minutes: 0,
        total_break_minutes: 0,
        paid_minutes: 0,
        admin_note: "Marked absent from block time",
        clocked_in_by: "owner-1",
      },
      {
        salon_id: "salon-1",
        stylist_id: "stylist-2",
        session_date: "2026-05-31",
        is_absent: true,
        status: "closed",
        total_worked_minutes: 0,
        total_break_minutes: 0,
        paid_minutes: 0,
        admin_note: "Marked absent from block time",
        clocked_in_by: "owner-1",
      },
    ]);
  });
});

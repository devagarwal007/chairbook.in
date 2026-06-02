import { describe, expect, it } from "vitest";
import { filterBookingListAppointments, normalizeBookingListSearchQuery } from "./booking-list-search";
import type { CalAppt, Stylist } from "../types";

const makeAppointment = (overrides: Partial<CalAppt>): CalAppt => ({
  id: "booking-1",
  dayKey: "2026-06-01",
  stylistId: "stylist-1",
  startH: 10,
  startM: 0,
  duration: 45,
  customer: "Priya Sharma",
  initials: "PS",
  tone: "b",
  service: "Haircut + Blow dry",
  status: "confirmed",
  phone: "+91 98765 43210",
  paymentStatus: "due",
  billTotal: 1200,
  amountPaid: 0,
  amountDue: 1200,
  ...overrides,
});

const stylists: Stylist[] = [
  { id: "stylist-1", name: "Anjali", short: "A", tone: "b" },
  { id: "stylist-2", name: "Meera Iyer", short: "M", tone: "c" },
];

describe("normalizeBookingListSearchQuery", () => {
  it("trims, lowercases, and collapses spacing", () => {
    expect(normalizeBookingListSearchQuery("  PRIYA   Sharma  ")).toBe("priya sharma");
  });
});

describe("filterBookingListAppointments", () => {
  const appointments = [
    makeAppointment({ id: "booking-1" }),
    makeAppointment({
      id: "booking-2",
      stylistId: "stylist-2",
      customer: "Kavya Rao",
      initials: "KR",
      service: "Global colour",
      phone: "+91 91234 56789",
      status: "arrived",
    }),
    makeAppointment({
      id: "booking-3",
      stylistId: "stylist-1",
      customer: "Rohan Patel",
      initials: "RP",
      service: "Beard trim",
      phone: undefined,
      status: "completed",
      paymentStatus: "paid",
    }),
  ];

  it("returns the original list when the query is blank", () => {
    expect(filterBookingListAppointments(appointments, stylists, "   ")).toEqual(appointments);
  });

  it("matches customer, service, stylist, and phone text without changing order", () => {
    expect(filterBookingListAppointments(appointments, stylists, "kavya")).toEqual([appointments[1]]);
    expect(filterBookingListAppointments(appointments, stylists, "colour")).toEqual([appointments[1]]);
    expect(filterBookingListAppointments(appointments, stylists, "anjali")).toEqual([appointments[0], appointments[2]]);
    expect(filterBookingListAppointments(appointments, stylists, "91234")).toEqual([appointments[1]]);
  });
});

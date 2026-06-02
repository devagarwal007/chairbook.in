import type { CalAppt, Stylist } from "@/types";

export const BOOKING_LIST_SEARCH_MAX_LENGTH = 120;

export function normalizeBookingListSearchQuery(query: string): string {
  return query
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, BOOKING_LIST_SEARCH_MAX_LENGTH);
}

function getSearchableText(appointment: CalAppt, stylist?: Stylist): string {
  return [
    appointment.customer,
    appointment.service,
    appointment.phone,
    appointment.status,
    appointment.paymentStatus,
    stylist?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKC")
    .toLowerCase();
}

export function filterBookingListAppointments(
  appointments: CalAppt[],
  stylists: Stylist[],
  query: string,
): CalAppt[] {
  const normalizedQuery = normalizeBookingListSearchQuery(query);
  if (!normalizedQuery) return appointments;

  const stylistById = new Map(stylists.map((stylist) => [stylist.id, stylist]));

  return appointments.filter((appointment) =>
    getSearchableText(appointment, stylistById.get(appointment.stylistId)).includes(normalizedQuery),
  );
}

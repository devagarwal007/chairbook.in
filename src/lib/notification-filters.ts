const NOTIFICATION_TYPE_FILTERS: Record<string, string[]> = {
  bookings: [
    "new_booking",
    "walk_in",
    "status_update",
    "confirmed",
    "rescheduled",
    "reschedule",
    "cancelled",
    "cancellation",
  ],
  alerts: ["noshow", "attendance_correction"],
  payments: ["payment"],
  wa: ["wa_reply", "review"],
};

export function getNotificationTypeFilter(filter: string): string[] | null {
  return NOTIFICATION_TYPE_FILTERS[filter] || null;
}

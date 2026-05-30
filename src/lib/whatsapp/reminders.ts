interface ReminderDueInput {
  bookingDate: string;
  bookingTime: string;
  reminderHours: number;
  now?: Date;
  timezoneOffsetMinutes?: number;
  sendWindowMinutes?: number;
}

export function isReminderDue({
  bookingDate,
  bookingTime,
  reminderHours,
  now = new Date(),
  timezoneOffsetMinutes = 330,
  sendWindowMinutes = 15,
}: ReminderDueInput): boolean {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = bookingTime.slice(0, 5).split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return false;
  }

  const bookingStartUtcMs = Date.UTC(year, month - 1, day, hour, minute) - timezoneOffsetMinutes * 60_000;
  const dueAt = bookingStartUtcMs - reminderHours * 60 * 60_000;
  const dueUntil = dueAt + sendWindowMinutes * 60_000;
  const nowMs = now.getTime();

  return nowMs >= dueAt && nowMs < dueUntil;
}

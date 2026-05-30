import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppServerConfig } from "@/lib/whatsapp/server-config";
import { buildBookingReminderPayload } from "@/lib/whatsapp/message-payloads";
import { isReminderDue } from "@/lib/whatsapp/reminders";
import { sendWhatsAppTemplateForSalon, WhatsAppSendError } from "@/lib/whatsapp/send-service";

type RelatedRow<T> = T | T[] | null | undefined;

type ReminderBookingRow = {
  id: string;
  salon_id: string;
  customer_id: string | null;
  date: string;
  start_time: string;
  customer: RelatedRow<{ id: string; name: string | null; phone: string | null }>;
  stylist: RelatedRow<{ name: string | null }>;
  salon: RelatedRow<{ wa_settings: { reminder?: number; autoConfirm?: boolean } | null }>;
  booking_services: Array<{
    service: RelatedRow<{ name: string | null }>;
  }> | null;
};

function firstRelated<T>(row: RelatedRow<T>): T | null {
  if (Array.isArray(row)) return row[0] ?? null;
  return row ?? null;
}

function dateKeyForIndia(date: Date) {
  return new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const config = getWhatsAppServerConfig();
  const admin = getSupabaseAdminClient();
  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (!config.cronSecret || (auth !== `Bearer ${config.cronSecret}` && headerSecret !== config.cronSecret)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const now = new Date();
  const today = dateKeyForIndia(now);
  const maxDate = dateKeyForIndia(new Date(now.getTime() + 3 * 24 * 60 * 60_000));
  const { data: bookingRows, error: bookingError } = await admin
    .from("bookings")
    .select(`
      id,
      salon_id,
      customer_id,
      date,
      start_time,
      customer:customers (id, name, phone),
      stylist:stylists (name),
      salon:salons (wa_settings),
      booking_services (
        service:services (name)
      )
    `)
    .gte("date", today)
    .lte("date", maxDate)
    .in("status", ["confirmed", "Confirmed"]);

  if (bookingError) {
    return NextResponse.json({ error: "Could not load reminder candidates." }, { status: 500 });
  }

  let eligible = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ bookingId: string; message: string }> = [];

  for (const rawBooking of bookingRows || []) {
    const booking = rawBooking as unknown as ReminderBookingRow;
    const salon = firstRelated(booking.salon);
    const reminderHours = Number(salon?.wa_settings?.reminder || 24);

    if (!isReminderDue({
      bookingDate: booking.date,
      bookingTime: booking.start_time,
      reminderHours,
      now,
      timezoneOffsetMinutes: 330,
      sendWindowMinutes: 15,
    })) {
      continue;
    }

    eligible += 1;

    const { data: existingMessage } = await admin
      .from("whatsapp_messages")
      .select("id")
      .eq("salon_id", booking.salon_id)
      .eq("booking_id", booking.id)
      .eq("template_key", "booking_reminder")
      .eq("direction", "outbound")
      .in("status", ["queued", "reserved", "sent", "delivered", "read"])
      .limit(1)
      .maybeSingle();

    if (existingMessage) {
      skipped += 1;
      continue;
    }

    const customer = firstRelated(booking.customer);
    if (!customer?.phone) {
      skipped += 1;
      continue;
    }

    const stylist = firstRelated(booking.stylist);
    const serviceNames = (booking.booking_services || [])
      .map((row) => firstRelated(row.service)?.name)
      .filter((name): name is string => Boolean(name));

    try {
      await sendWhatsAppTemplateForSalon(buildBookingReminderPayload({
        salonId: booking.salon_id,
        to: customer.phone,
        bookingId: booking.id,
        customerId: customer.id || booking.customer_id || undefined,
        customerName: customer.name || "there",
        serviceNames: serviceNames.length ? serviceNames : ["Appointment"],
        dateLabel: booking.date,
        time: booking.start_time.slice(0, 5),
        stylistName: stylist?.name || "your stylist",
      }));
      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        bookingId: booking.id,
        message: error instanceof WhatsAppSendError ? error.message : "Could not send reminder.",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    eligibleBookings: eligible,
    sent,
    skipped,
    failed,
    errors: errors.slice(0, 5),
  });
}

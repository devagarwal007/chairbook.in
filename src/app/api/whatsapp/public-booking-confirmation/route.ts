import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildBookingConfirmationPayload } from "@/lib/whatsapp/message-payloads";
import { sendWhatsAppTemplateForSalon, WhatsAppSendError } from "@/lib/whatsapp/send-service";

type PublicConfirmationPayload = {
  salonId?: string;
  bookingId?: string;
};

type RelatedRow<T> = T | T[] | null | undefined;

type PublicBookingRow = {
  id: string;
  salon_id: string;
  customer_id: string | null;
  date: string;
  start_time: string;
  customer: RelatedRow<{ id: string; name: string | null; phone: string | null }>;
  stylist: RelatedRow<{ name: string | null }>;
  booking_services: Array<{
    service: RelatedRow<{ name: string | null }>;
  }> | null;
};

function firstRelated<T>(row: RelatedRow<T>): T | null {
  if (Array.isArray(row)) return row[0] ?? null;
  return row ?? null;
}

function makePublicError(status = 400) {
  return NextResponse.json({
    ok: false,
    error: "Booking confirmed. WhatsApp could not be sent right now.",
  }, { status });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as PublicConfirmationPayload | null;
  if (!payload?.salonId || !payload.bookingId) return makePublicError(400);

  const admin = getSupabaseAdminClient();
  if (!admin) return makePublicError(500);

  const { data: existingMessage } = await admin
    .from("whatsapp_messages")
    .select("id,status")
    .eq("salon_id", payload.salonId)
    .eq("booking_id", payload.bookingId)
    .eq("template_key", "booking_confirmation")
    .eq("direction", "outbound")
    .in("status", ["queued", "reserved", "sent", "delivered", "read"])
    .limit(1)
    .maybeSingle();

  if (existingMessage) {
    return NextResponse.json({ ok: true, skipped: true, messageId: existingMessage.id });
  }

  const { data: bookingData, error: bookingError } = await admin
    .from("bookings")
    .select(`
      id,
      salon_id,
      customer_id,
      date,
      start_time,
      customer:customers (id, name, phone),
      stylist:stylists (name),
      booking_services (
        service:services (name)
      )
    `)
    .eq("id", payload.bookingId)
    .eq("salon_id", payload.salonId)
    .maybeSingle();

  if (bookingError || !bookingData) return makePublicError(404);

  const booking = bookingData as unknown as PublicBookingRow;
  const customer = firstRelated(booking.customer);
  if (!customer?.phone) return makePublicError(400);

  const stylist = firstRelated(booking.stylist);
  const serviceNames = (booking.booking_services || [])
    .map((row) => firstRelated(row.service)?.name)
    .filter((name): name is string => Boolean(name));

  try {
    const result = await sendWhatsAppTemplateForSalon(buildBookingConfirmationPayload({
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

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof WhatsAppSendError) {
      return makePublicError(error.status === 402 ? 402 : 400);
    }
    return makePublicError(500);
  }
}

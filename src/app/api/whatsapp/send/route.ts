import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sendWhatsAppTemplateForSalon,
  WhatsAppSendError,
  type WhatsAppTemplateSendInput,
} from "@/lib/whatsapp/send-service";

type SendPayload = Partial<WhatsAppTemplateSendInput>;

function makeError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) return makeError("Supabase is not configured.", 500);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return makeError("You must be signed in.", 401);

  const payload = await request.json().catch(() => null) as SendPayload | null;
  if (!payload?.salonId || !payload.to || !payload.templateName) {
    return makeError("Salon, recipient, and template are required.", 400);
  }

  const { data: salon } = await supabase
    .from("salons")
    .select("id")
    .eq("id", payload.salonId)
    .maybeSingle();
  if (!salon) return makeError("Salon not found or not allowed.", 403);

  const sendInput: WhatsAppTemplateSendInput = {
    salonId: payload.salonId,
    to: payload.to,
    templateName: payload.templateName,
    templateKey: payload.templateKey,
    templateCategory: payload.templateCategory,
    languageCode: payload.languageCode,
    bodyParameters: payload.bodyParameters,
    bookingId: payload.bookingId,
    customerId: payload.customerId,
    invoiceId: payload.invoiceId,
  };

  try {
    const result = await sendWhatsAppTemplateForSalon(sendInput);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof WhatsAppSendError) {
      return makeError(error.message, error.status);
    }
    return makeError("Could not send WhatsApp message.", 500);
  }
}

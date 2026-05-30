import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppServerConfig } from "@/lib/whatsapp/server-config";
import { verifyMetaWebhookSignature, verifyWebhookChallenge } from "@/lib/whatsapp/security";
import { parseWhatsAppWebhookEvents } from "@/lib/whatsapp/webhook";

export async function GET(request: Request) {
  const config = getWhatsAppServerConfig();
  const challenge = verifyWebhookChallenge(new URL(request.url).searchParams, config.webhookVerifyToken);

  if (!challenge) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const config = getWhatsAppServerConfig();
  const admin = getSupabaseAdminClient();

  if (!admin || !config.metaAppSecret) {
    return NextResponse.json({ error: "WhatsApp webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaWebhookSignature(rawBody, signature, config.metaAppSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const events = parseWhatsAppWebhookEvents(payload);

  for (const event of events) {
    await admin.from("whatsapp_webhook_events").upsert({
      event_id: event.eventId,
      event_type: event.eventType,
      payload: event,
      processed_at: new Date().toISOString(),
    }, { onConflict: "event_id", ignoreDuplicates: true });

    if (event.eventType === "message") {
      const { data: channel } = await admin
        .from("whatsapp_channels")
        .select("id, salon_id, display_number")
        .eq("phone_number_id", event.phoneNumberId || "")
        .maybeSingle();

      if (!channel?.salon_id) continue;

      await admin.from("whatsapp_messages").upsert({
        salon_id: channel.salon_id,
        channel_id: channel.id,
        direction: "inbound",
        message_type: "text",
        status: "inbound",
        meta_message_id: event.metaMessageId,
        from_phone: event.fromPhone || null,
        to_phone: channel.display_number || event.displayPhoneNumber || null,
        body: event.body || "",
        provider_payload: event,
      }, { onConflict: "meta_message_id", ignoreDuplicates: true });
    }

    if (event.eventType === "status") {
      const patch: Record<string, string | null> = {
        status: event.status || null,
        conversation_id: event.conversationId || null,
      };
      const now = new Date().toISOString();
      if (event.status === "delivered") patch.delivered_at = now;
      if (event.status === "read") patch.read_at = now;
      if (event.status === "failed") patch.failed_at = now;

      await admin
        .from("whatsapp_messages")
        .update(patch)
        .eq("meta_message_id", event.metaMessageId);
    }
  }

  return NextResponse.json({ ok: true, processed: events.length });
}

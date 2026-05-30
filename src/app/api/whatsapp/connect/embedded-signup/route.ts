import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/whatsapp/security";
import { exchangeEmbeddedSignupCode, subscribeWabaToApp } from "@/lib/whatsapp/meta-client";
import { getWhatsAppServerConfig } from "@/lib/whatsapp/server-config";

type EmbeddedSignupPayload = {
  salonId?: string;
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayNumber?: string;
  businessAccountId?: string;
};

function makeError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  const config = getWhatsAppServerConfig();

  if (!supabase || !admin) return makeError("Supabase is not configured.", 500);
  if (!config.metaAppId || !config.metaAppSecret || !config.tokenEncryptionKey) {
    return makeError("Meta Embedded Signup is not configured.", 503);
  }

  const payload = await request.json().catch(() => null) as EmbeddedSignupPayload | null;
  if (!payload?.salonId || !payload.code || !payload.wabaId || !payload.phoneNumberId) {
    return makeError("Salon, code, WABA, and phone number are required.", 400);
  }

  const { data: salon } = await supabase
    .from("salons")
    .select("id")
    .eq("id", payload.salonId)
    .maybeSingle();
  if (!salon) return makeError("Salon not found or not allowed.", 403);

  const exchange = await exchangeEmbeddedSignupCode({
    graphApiVersion: config.graphApiVersion,
    appId: config.metaAppId,
    appSecret: config.metaAppSecret,
    code: payload.code,
  });
  if (!exchange.ok) return makeError(exchange.userMessage, 400);

  const subscribe = await subscribeWabaToApp({
    graphApiVersion: config.graphApiVersion,
    wabaId: payload.wabaId,
    accessToken: exchange.accessToken,
  });

  const { data: channel, error: channelError } = await admin
    .from("whatsapp_channels")
    .upsert({
      salon_id: payload.salonId,
      mode: "salon_owned",
      status: "active",
      credit_line_status: "pending",
      webhook_status: subscribe.ok ? "subscribed" : "error",
      waba_id: payload.wabaId,
      business_account_id: payload.businessAccountId || null,
      phone_number_id: payload.phoneNumberId,
      display_number: payload.displayNumber || null,
      last_verified_at: new Date().toISOString(),
      last_error: subscribe.ok ? null : subscribe.userMessage,
    }, { onConflict: "salon_id,mode" })
    .select("id, webhook_status, credit_line_status")
    .single();

  if (channelError || !channel?.id) {
    return makeError("Could not save WhatsApp channel.", 500);
  }

  await admin.from("whatsapp_channel_secrets").upsert({
    channel_id: channel.id,
    encrypted_access_token: encryptSecret(exchange.accessToken, config.tokenEncryptionKey),
    key_version: 1,
  }, { onConflict: "channel_id" });

  return NextResponse.json({
    ok: true,
    channelId: channel.id,
    webhookStatus: channel.webhook_status,
    creditLineStatus: channel.credit_line_status,
  });
}

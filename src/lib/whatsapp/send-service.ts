import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/whatsapp/security";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/meta-client";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import { getWhatsAppSenderPreference, selectWhatsappSender, type WhatsAppChannel } from "@/lib/whatsapp/senders";
import { getWhatsAppServerConfig } from "@/lib/whatsapp/server-config";
import type { WhatsAppTemplateCategory } from "@/lib/whatsapp/message-payloads";

export interface WhatsAppTemplateSendInput {
  salonId: string;
  to: string;
  templateKey?: string;
  templateName: string;
  templateCategory?: WhatsAppTemplateCategory;
  languageCode?: string;
  bodyParameters?: string[];
  bookingId?: string;
  customerId?: string;
  invoiceId?: string;
}

export interface WhatsAppTemplateSendResult {
  messageId: string;
  metaMessageId?: string;
}

export class WhatsAppSendError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WhatsAppSendError";
    this.status = status;
  }
}

export async function sendWhatsAppTemplateForSalon(input: WhatsAppTemplateSendInput): Promise<WhatsAppTemplateSendResult> {
  const admin = getSupabaseAdminClient();
  const config = getWhatsAppServerConfig();

  if (!admin) throw new WhatsAppSendError("Supabase is not configured.", 500);
  if (!input.salonId || !input.to || !input.templateName) {
    throw new WhatsAppSendError("Salon, recipient, and template are required.", 400);
  }

  const templateCategory = input.templateCategory || "utility";
  if (templateCategory === "marketing") {
    throw new WhatsAppSendError("Marketing WhatsApp sends are disabled until opt-in controls are available.", 403);
  }

  const to = normalizeWhatsAppPhone(input.to);
  const { data: pricingRule } = await admin
    .from("whatsapp_pricing_rules")
    .select("credit_units")
    .eq("country_code", "91")
    .eq("category", templateCategory)
    .eq("active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  const creditUnits = Number(pricingRule?.credit_units || 1);

  const { data: salonSettings } = await admin
    .from("salons")
    .select("wa_settings")
    .eq("id", input.salonId)
    .maybeSingle();
  const senderPreference = getWhatsAppSenderPreference(salonSettings?.wa_settings);

  const { data: channelRows } = await admin
    .from("whatsapp_channels")
    .select("id, salon_id, mode, status, credit_line_status, phone_number_id, display_number")
    .eq("salon_id", input.salonId);

  const channels: WhatsAppChannel[] = (channelRows || []).map((channel) => ({
    id: channel.id,
    salonId: channel.salon_id,
    mode: channel.mode,
    status: channel.status,
    creditLineStatus: channel.credit_line_status,
    phoneNumberId: channel.phone_number_id,
    displayNumber: channel.display_number,
  }));

  if (config.chairbookAccessToken && config.chairbookPhoneNumberId) {
    channels.push({
      id: "chairbook-env-fallback",
      salonId: input.salonId,
      mode: "chairbook_fallback",
      status: "active",
      creditLineStatus: "active",
      phoneNumberId: config.chairbookPhoneNumberId,
      displayNumber: null,
    });
  }

  const sender = selectWhatsappSender(channels, senderPreference);
  if (!sender?.phoneNumberId) {
    throw new WhatsAppSendError("No active WhatsApp sender is connected for this salon.", 409);
  }

  let accessToken = config.chairbookAccessToken;
  if (sender.mode === "salon_owned") {
    if (!config.tokenEncryptionKey) throw new WhatsAppSendError("WhatsApp token encryption is not configured.", 500);
    const { data: secretRow } = await admin
      .from("whatsapp_channel_secrets")
      .select("encrypted_access_token")
      .eq("channel_id", sender.id)
      .maybeSingle();
    if (!secretRow?.encrypted_access_token) throw new WhatsAppSendError("WhatsApp channel token is missing.", 409);
    accessToken = decryptSecret(secretRow.encrypted_access_token, config.tokenEncryptionKey);
  }

  if (!accessToken) throw new WhatsAppSendError("WhatsApp access token is not configured.", 500);

  const { data: message, error: messageError } = await admin
    .from("whatsapp_messages")
    .insert({
      salon_id: input.salonId,
      channel_id: sender.id === "chairbook-env-fallback" ? null : sender.id,
      booking_id: input.bookingId || null,
      customer_id: input.customerId || null,
      invoice_id: input.invoiceId || null,
      direction: "outbound",
      message_type: "template",
      template_key: input.templateKey || input.templateName,
      template_category: templateCategory,
      to_phone: to,
      credit_units_reserved: creditUnits,
      status: "queued",
    })
    .select("id")
    .single();

  if (messageError || !message?.id) {
    throw new WhatsAppSendError("Could not queue WhatsApp message.", 500);
  }

  const { error: reserveError } = await admin.rpc("reserve_message_credits", {
    p_salon_id: input.salonId,
    p_message_id: message.id,
    p_units: creditUnits,
    p_idempotency_key: `reserve:${message.id}`,
  });

  if (reserveError) {
    await admin.from("whatsapp_messages").update({
      status: "failed",
      failure_message: "Insufficient WhatsApp credits",
      failed_at: new Date().toISOString(),
    }).eq("id", message.id);
    throw new WhatsAppSendError("Insufficient WhatsApp credits. Please refill to continue sending.", 402);
  }

  await admin.from("whatsapp_messages").update({ status: "reserved" }).eq("id", message.id);

  const sendResult = await sendWhatsAppTemplate({
    graphApiVersion: config.graphApiVersion,
    phoneNumberId: sender.phoneNumberId,
    accessToken,
    to,
    templateName: input.templateName,
    languageCode: input.languageCode || "en",
    bodyParameters: input.bodyParameters || [],
  });

  if (!sendResult.ok) {
    await admin.rpc("release_reserved_message_credits", {
      p_salon_id: input.salonId,
      p_message_id: message.id,
      p_units: creditUnits,
      p_idempotency_key: `release:${message.id}`,
    });
    await admin.from("whatsapp_messages").update({
      status: "failed",
      failure_code: sendResult.providerCode ? String(sendResult.providerCode) : null,
      failure_message: sendResult.userMessage,
      failed_at: new Date().toISOString(),
    }).eq("id", message.id);
    throw new WhatsAppSendError(sendResult.userMessage, 400);
  }

  await admin.rpc("consume_reserved_message_credits", {
    p_salon_id: input.salonId,
    p_message_id: message.id,
    p_units: creditUnits,
    p_idempotency_key: `consume:${message.id}`,
  });

  await admin.from("whatsapp_messages").update({
    status: "sent",
    meta_message_id: sendResult.messageId,
    credit_units_consumed: creditUnits,
    sent_at: new Date().toISOString(),
  }).eq("id", message.id);

  return { messageId: message.id, metaMessageId: sendResult.messageId };
}

import type { WhatsAppTemplatePayload } from "@/lib/whatsapp/message-payloads";

export type WhatsAppClientSendInput = WhatsAppTemplatePayload;

export async function sendWhatsAppTemplateFromClient(input: WhatsAppClientSendInput) {
  const response = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json().catch(() => null);
  return {
    ok: response.ok && body?.ok === true,
    message: body?.error || body?.message || null,
    data: body,
  };
}

export type WhatsAppChannelMode = "salon_owned" | "chairbook_fallback";
export type WhatsAppChannelStatus = "active" | "pending" | "inactive" | "error";
export type WhatsAppCreditLineStatus = "active" | "pending" | "missing" | "error";
export type WhatsAppSenderPreference = "chairbook" | "salon_owned";

export interface WhatsAppChannel {
  id: string;
  salonId: string;
  mode: WhatsAppChannelMode;
  status: WhatsAppChannelStatus;
  creditLineStatus: WhatsAppCreditLineStatus;
  phoneNumberId: string | null;
  displayNumber: string | null;
}

export function selectWhatsappSender(
  channels: WhatsAppChannel[],
  preference: WhatsAppSenderPreference = "chairbook",
): WhatsAppChannel | null {
  const usable = channels.filter(isUsableSender);
  const chairbookSender = usable.find((channel) => channel.mode === "chairbook_fallback") || null;
  const salonSender = usable.find((channel) => channel.mode === "salon_owned") || null;

  if (preference === "salon_owned") {
    return salonSender || chairbookSender;
  }

  return chairbookSender;
}

export function isUsableSender(channel: WhatsAppChannel): boolean {
  return channel.status === "active"
    && channel.creditLineStatus === "active"
    && Boolean(channel.phoneNumberId);
}

export function getWhatsAppSenderPreference(settings: unknown): WhatsAppSenderPreference {
  if (!settings || typeof settings !== "object") return "chairbook";

  const senderPreference = (settings as { senderPreference?: unknown }).senderPreference;
  return senderPreference === "salon_owned" ? "salon_owned" : "chairbook";
}

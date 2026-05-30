export type WhatsAppChannelMode = "salon_owned" | "chairbook_fallback";
export type WhatsAppChannelStatus = "active" | "pending" | "inactive" | "error";
export type WhatsAppCreditLineStatus = "active" | "pending" | "missing" | "error";

export interface WhatsAppChannel {
  id: string;
  salonId: string;
  mode: WhatsAppChannelMode;
  status: WhatsAppChannelStatus;
  creditLineStatus: WhatsAppCreditLineStatus;
  phoneNumberId: string | null;
  displayNumber: string | null;
}

export function selectWhatsappSender(channels: WhatsAppChannel[]): WhatsAppChannel | null {
  const usable = channels.filter(isUsableSender);
  return usable.find((channel) => channel.mode === "salon_owned")
    || usable.find((channel) => channel.mode === "chairbook_fallback")
    || null;
}

export function isUsableSender(channel: WhatsAppChannel): boolean {
  return channel.status === "active"
    && channel.creditLineStatus === "active"
    && Boolean(channel.phoneNumberId);
}

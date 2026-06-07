import type { SettingsData, WhatsAppSenderPreference } from "@/types";

export function normalizeWhatsAppSenderPreference(value: unknown): WhatsAppSenderPreference {
  return value === "salon_owned" ? "salon_owned" : "chairbook";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readWhatsAppSenderPreference(settings: unknown): WhatsAppSenderPreference {
  return isRecord(settings) ? normalizeWhatsAppSenderPreference(settings.senderPreference) : "chairbook";
}

export function withWhatsAppSenderPreference(settings: unknown, preference: WhatsAppSenderPreference) {
  return {
    ...(isRecord(settings) ? settings : {}),
    senderPreference: preference,
  };
}

export function buildWhatsAppSettingsPayload(wa: SettingsData["wa"]) {
  return {
    reminder: wa.reminder,
    autoConfirm: wa.autoConfirm,
    sendOffers: false,
    verified: wa.verified ?? true,
    senderPreference: normalizeWhatsAppSenderPreference(wa.senderPreference),
    templates: wa.templates,
  };
}

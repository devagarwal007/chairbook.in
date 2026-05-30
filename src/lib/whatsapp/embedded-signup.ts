export interface EmbeddedSignupInfo {
  wabaId: string;
  phoneNumberId: string;
  businessAccountId?: string;
  displayNumber?: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? value as UnknownRecord : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function extractEmbeddedSignupCode(response: unknown): string | null {
  const root = asRecord(response);
  const authResponse = asRecord(root?.authResponse);
  return asString(authResponse?.code) || asString(root?.code) || null;
}

export function parseEmbeddedSignupMessage(rawData: unknown): EmbeddedSignupInfo | null {
  let payload: unknown = rawData;
  if (typeof rawData === "string") {
    try {
      payload = JSON.parse(rawData);
    } catch {
      return null;
    }
  }

  const root = asRecord(payload);
  if (!root) return null;

  const eventName = asString(root.event)?.toUpperCase();
  const messageType = asString(root.type);
  if (eventName !== "FINISH" || (messageType && messageType !== "WA_EMBEDDED_SIGNUP")) {
    return null;
  }

  const data = asRecord(root.data) || root;
  const wabaId = asString(data.waba_id) || asString(data.wabaId);
  const phoneNumberId = asString(data.phone_number_id) || asString(data.phoneNumberId);
  if (!wabaId || !phoneNumberId) return null;

  return {
    wabaId,
    phoneNumberId,
    businessAccountId: asString(data.business_id) || asString(data.businessAccountId),
    displayNumber: asString(data.display_phone_number) || asString(data.displayNumber),
  };
}

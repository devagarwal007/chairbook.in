const UNKNOWN_NOTIFICATION_ERROR = "Unknown notification insert error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function describeNotificationError(error: unknown): string {
  if (!error) return UNKNOWN_NOTIFICATION_ERROR;

  if (error instanceof Error) {
    return error.message || UNKNOWN_NOTIFICATION_ERROR;
  }

  if (typeof error === "string") {
    return nonEmptyString(error) ?? UNKNOWN_NOTIFICATION_ERROR;
  }

  if (!isRecord(error)) {
    return String(error);
  }

  const message = nonEmptyString(error.message);
  const details = nonEmptyString(error.details);
  const hint = nonEmptyString(error.hint);
  const code = nonEmptyString(error.code);
  const parts = [message, details, hint].filter((part): part is string => Boolean(part));

  if (parts.length > 0 && code) {
    return `${parts.join(" | ")} (${code})`;
  }

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  if (code) {
    return `Supabase error ${code}`;
  }

  return UNKNOWN_NOTIFICATION_ERROR;
}

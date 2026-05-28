const GST_TABLE_NAMES = [
  "salon_gst_settings",
  "gst_invoices",
  "gst_invoice_items",
  "gst_invoice_counters",
];

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

function asErrorLike(error: unknown): SupabaseErrorLike {
  return error && typeof error === "object" ? error as SupabaseErrorLike : {};
}

export const GST_SCHEMA_MISSING_MESSAGE =
  "GST database tables are missing. Run the GST Supabase migration first.";

export function getSupabaseErrorMessage(error: unknown): string {
  const errorLike = asErrorLike(error);
  const parts = [errorLike.message, errorLike.details, errorLike.hint]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  return parts.length > 0 ? parts.join(" ") : "Unknown Supabase error";
}

export function isMissingGstSchemaError(error: unknown): boolean {
  const errorLike = asErrorLike(error);
  const code = typeof errorLike.code === "string" ? errorLike.code : "";
  const message = getSupabaseErrorMessage(error).toLowerCase();

  const pointsAtGstTable = GST_TABLE_NAMES.some((tableName) => message.includes(tableName));
  return pointsAtGstTable && (code === "PGRST205" || code === "42P01" || message.includes("schema cache"));
}

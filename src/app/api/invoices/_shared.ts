import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  INVOICE_PAGE_SIZE,
  type GstInvoiceStatusFilter,
  type InvoicePaymentMethodFilter,
  type InvoiceSort,
} from "../../../types/invoice";
import { sanitizeInvoiceSearchForQuery } from "../../../lib/invoices";

const SORTS = new Set<InvoiceSort>(["newest", "oldest", "amount_desc", "amount_asc"]);
const PAYMENT_METHODS = new Set<InvoicePaymentMethodFilter>(["all", "upi", "card", "cash", "due", "other"]);
const GST_STATUSES = new Set<GstInvoiceStatusFilter>([
  "all",
  "not_available",
  "pending",
  "sent",
  "delivered",
  "failed",
]);

export type ParsedInvoiceParams = {
  q: string;
  from: string;
  to: string;
  paymentMethod: InvoicePaymentMethodFilter;
  whatsappStatus: GstInvoiceStatusFilter;
  sort: InvoiceSort;
  page: number;
  pageSize: number;
};

type ParseResult =
  | { ok: true; params: ParsedInvoiceParams }
  | { ok: false; response: NextResponse };

export function makeInvoiceError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function makeInvoiceResponse<T>(rows: T[], total: number, page: number) {
  const safeTotal = Math.max(0, total || 0);
  return NextResponse.json({
    rows,
    total: safeTotal,
    page,
    pageSize: INVOICE_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(safeTotal / INVOICE_PAGE_SIZE)),
  });
}

export function parseInvoiceParams(requestUrl: string, options: { includeWhatsappStatus: boolean }): ParseResult {
  const url = new URL(requestUrl);
  const params = url.searchParams;
  const sort = params.get("sort") || "newest";
  const paymentMethod = params.get("paymentMethod") || "all";
  const whatsappStatus = params.get("whatsappStatus") || "all";
  const pageRaw = Number(params.get("page") || "1");
  const pageSizeRaw = Number(params.get("pageSize") || String(INVOICE_PAGE_SIZE));
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  if (!SORTS.has(sort as InvoiceSort)) {
    return { ok: false, response: makeInvoiceError("Invalid invoice sort.", 400) };
  }
  if (!PAYMENT_METHODS.has(paymentMethod as InvoicePaymentMethodFilter)) {
    return { ok: false, response: makeInvoiceError("Invalid payment method filter.", 400) };
  }
  if (options.includeWhatsappStatus && !GST_STATUSES.has(whatsappStatus as GstInvoiceStatusFilter)) {
    return { ok: false, response: makeInvoiceError("Invalid WhatsApp status filter.", 400) };
  }
  if (!isValidDateParam(from) || !isValidDateParam(to)) {
    return { ok: false, response: makeInvoiceError("Invalid invoice date filter.", 400) };
  }
  if (from && to && from > to) {
    return { ok: false, response: makeInvoiceError("Invoice start date must be before end date.", 400) };
  }

  return {
    ok: true,
    params: {
      q: sanitizeInvoiceSearchForQuery(params.get("q") || ""),
      from,
      to,
      paymentMethod: paymentMethod as InvoicePaymentMethodFilter,
      whatsappStatus: (options.includeWhatsappStatus ? whatsappStatus : "all") as GstInvoiceStatusFilter,
      sort: sort as InvoiceSort,
      page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
      pageSize: Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
        ? Math.min(Math.floor(pageSizeRaw), INVOICE_PAGE_SIZE)
        : INVOICE_PAGE_SIZE,
    },
  };
}

export function invoiceRange(page: number) {
  const from = (Math.max(1, page) - 1) * INVOICE_PAGE_SIZE;
  return { from, to: from + INVOICE_PAGE_SIZE - 1 };
}

export function invoiceSearchPattern(q: string) {
  return `%${q}%`;
}

export function paymentMethodPattern(filter: InvoicePaymentMethodFilter): string | null {
  if (filter === "upi") return "%UPI%";
  if (filter === "card") return "%Card%";
  if (filter === "cash") return "%Cash%";
  if (filter === "due") return "%Due%";
  return null;
}

export const KNOWN_PAYMENT_PATTERNS = ["%UPI%", "%Card%", "%Cash%", "%Due%"];

export async function getCurrentOrgId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { orgId: null, error };
  return { orgId: data?.org_id || null, error: null };
}

export async function getPrimarySalonId(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("salons")
    .select("id")
    .eq("org_id", orgId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return { salonId: null, error };
  return { salonId: data?.id || null, error: null };
}

function isValidDateParam(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;

  return date.toISOString().slice(0, 10) === value;
}

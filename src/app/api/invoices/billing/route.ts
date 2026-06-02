import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BillingInvoiceListRow } from "@/types/invoice";
import {
  KNOWN_PAYMENT_PATTERNS,
  getCurrentOrgId,
  invoiceRange,
  invoiceSearchPattern,
  makeInvoiceError,
  makeInvoiceResponse,
  parseInvoiceParams,
  paymentMethodPattern,
} from "../_shared";

type BillingInvoiceDbRow = {
  id: string;
  date: string;
  plan_name: string;
  amount: number | string;
  payment_method: string;
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return makeInvoiceError("Supabase is not configured.", 500);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return makeInvoiceError("You must be signed in.", 401);

  const parsed = parseInvoiceParams(request.url, { includeWhatsappStatus: false });
  if (!parsed.ok) return parsed.response;

  const { orgId, error: orgError } = await getCurrentOrgId(supabase, user.id);
  if (orgError) {
    console.error("Billing invoice org lookup failed:", orgError);
    return makeInvoiceError("Could not verify invoice access.", 500);
  }
  if (!orgId) return makeInvoiceResponse<BillingInvoiceListRow>([], 0, parsed.params.page);

  const { page, q, from, to, paymentMethod, sort } = parsed.params;
  const range = invoiceRange(page);

  let query = supabase
    .from("billing_invoices")
    .select("id, date, plan_name, amount, payment_method", { count: "exact" })
    .eq("org_id", orgId);

  if (q) {
    const pattern = invoiceSearchPattern(q);
    query = query.or(`plan_name.ilike.${pattern},payment_method.ilike.${pattern}`);
  }
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const paymentPattern = paymentMethodPattern(paymentMethod);
  if (paymentPattern) {
    query = query.ilike("payment_method", paymentPattern);
  } else if (paymentMethod === "other") {
    KNOWN_PAYMENT_PATTERNS.forEach((pattern) => {
      query = query.not("payment_method", "ilike", pattern);
    });
  }

  if (sort === "oldest") {
    query = query.order("date", { ascending: true }).order("created_at", { ascending: true });
  } else if (sort === "amount_desc") {
    query = query.order("amount", { ascending: false }).order("date", { ascending: false });
  } else if (sort === "amount_asc") {
    query = query.order("amount", { ascending: true }).order("date", { ascending: false });
  } else {
    query = query.order("date", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(range.from, range.to);
  if (error) {
    console.error("Billing invoice search failed:", error);
    return makeInvoiceError("Could not load billing invoices.", 500);
  }

  const rows: BillingInvoiceListRow[] = ((data || []) as BillingInvoiceDbRow[]).map((invoice) => ({
    id: invoice.id,
    date: invoice.date,
    plan_name: invoice.plan_name,
    amount: Number(invoice.amount || 0),
    payment_method: invoice.payment_method,
  }));

  return NextResponse.json({
    rows,
    total: count || 0,
    page,
    pageSize: parsed.params.pageSize,
    pageCount: Math.max(1, Math.ceil((count || 0) / parsed.params.pageSize)),
  });
}

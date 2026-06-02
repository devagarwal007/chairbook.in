import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GstInvoiceListRow } from "@/types/invoice";
import {
  KNOWN_PAYMENT_PATTERNS,
  getCurrentOrgId,
  getPrimarySalonId,
  invoiceRange,
  invoiceSearchPattern,
  makeInvoiceError,
  makeInvoiceResponse,
  parseInvoiceParams,
  paymentMethodPattern,
} from "../_shared";

type GstInvoiceDbRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number | string;
  payment_method: string | null;
  whatsapp_delivery_status: GstInvoiceListRow["whatsapp_delivery_status"];
  share_token: string;
  created_at: string;
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return makeInvoiceError("Supabase is not configured.", 500);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return makeInvoiceError("You must be signed in.", 401);

  const parsed = parseInvoiceParams(request.url, { includeWhatsappStatus: true });
  if (!parsed.ok) return parsed.response;

  const { orgId, error: orgError } = await getCurrentOrgId(supabase, user.id);
  if (orgError) {
    console.error("GST invoice org lookup failed:", orgError);
    return makeInvoiceError("Could not verify invoice access.", 500);
  }
  if (!orgId) return makeInvoiceResponse<GstInvoiceListRow>([], 0, parsed.params.page);

  const { salonId, error: salonError } = await getPrimarySalonId(supabase, orgId);
  if (salonError) {
    console.error("GST invoice salon lookup failed:", salonError);
    return makeInvoiceError("Could not verify invoice access.", 500);
  }
  if (!salonId) return makeInvoiceResponse<GstInvoiceListRow>([], 0, parsed.params.page);

  const { page, q, from, to, paymentMethod, whatsappStatus, sort } = parsed.params;
  const range = invoiceRange(page);

  let query = supabase
    .from("gst_invoices")
    .select(
      "id, invoice_number, invoice_date, customer_name, customer_phone, total_amount, payment_method, whatsapp_delivery_status, share_token, created_at",
      { count: "exact" },
    )
    .eq("salon_id", salonId);

  if (q) {
    const pattern = invoiceSearchPattern(q);
    query = query.or(`invoice_number.ilike.${pattern},customer_name.ilike.${pattern},customer_phone.ilike.${pattern}`);
  }
  if (from) query = query.gte("invoice_date", from);
  if (to) query = query.lte("invoice_date", to);
  if (whatsappStatus !== "all") query = query.eq("whatsapp_delivery_status", whatsappStatus);

  const paymentPattern = paymentMethodPattern(paymentMethod);
  if (paymentPattern) {
    query = query.ilike("payment_method", paymentPattern);
  } else if (paymentMethod === "other") {
    KNOWN_PAYMENT_PATTERNS.forEach((pattern) => {
      query = query.not("payment_method", "ilike", pattern);
    });
  }

  if (sort === "oldest") {
    query = query.order("invoice_date", { ascending: true }).order("created_at", { ascending: true });
  } else if (sort === "amount_desc") {
    query = query.order("total_amount", { ascending: false }).order("invoice_date", { ascending: false });
  } else if (sort === "amount_asc") {
    query = query.order("total_amount", { ascending: true }).order("invoice_date", { ascending: false });
  } else {
    query = query.order("invoice_date", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(range.from, range.to);
  if (error) {
    console.error("GST invoice search failed:", error);
    return makeInvoiceError("Could not load GST invoices.", 500);
  }

  const rows: GstInvoiceListRow[] = ((data || []) as GstInvoiceDbRow[]).map((invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    customer_name: invoice.customer_name,
    customer_phone: invoice.customer_phone,
    total_amount: Number(invoice.total_amount || 0),
    payment_method: invoice.payment_method,
    whatsapp_delivery_status: invoice.whatsapp_delivery_status,
    share_token: invoice.share_token,
  }));

  return NextResponse.json({
    rows,
    total: count || 0,
    page,
    pageSize: parsed.params.pageSize,
    pageCount: Math.max(1, Math.ceil((count || 0) / parsed.params.pageSize)),
  });
}

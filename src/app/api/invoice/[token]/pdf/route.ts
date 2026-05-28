import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { InvoicePdf } from "@/components/invoice/InvoicePdf";
import type { GstInvoice, GstInvoiceItem } from "@/types/gst";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return new NextResponse("Token is required", { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return new NextResponse("Supabase client failed to initialize", { status: 500 });
  }

  try {
    // 1. Fetch invoice using token (via RPC get_invoice_by_share_token)
    const { data: invoices, error: invError } = await supabase.rpc(
      "get_invoice_by_share_token",
      { p_token: token }
    );

    if (invError) {
      console.error("Error fetching invoice by token:", invError);
      return new NextResponse("Invoice not found or database error", { status: 404 });
    }

    const invoice = invoices?.[0] as GstInvoice | undefined;
    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    // 2. Fetch invoice items (via RPC get_invoice_items_by_invoice_id)
    const { data: items, error: itemsError } = await supabase.rpc(
      "get_invoice_items_by_invoice_id",
      { p_invoice_id: invoice.id }
    );

    if (itemsError) {
      console.error("Error fetching invoice items:", itemsError);
      return new NextResponse("Invoice items not found", { status: 500 });
    }

    const invoiceItems = (items || []) as GstInvoiceItem[];

    // 3. Render PDF document to buffer
    const element = React.createElement(InvoicePdf, {
      invoice,
      items: invoiceItems,
    }) as React.ReactElement<DocumentProps>;

    const pdfBlob = await pdf(element).toBlob();

    // 4. Return PDF response
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${invoice.invoice_number}.pdf"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("API invoice PDF generation error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

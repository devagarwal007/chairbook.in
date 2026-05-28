import { pdf, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { InvoicePdf } from "@/components/invoice/InvoicePdf";
import type { GstInvoice, GstInvoiceItem } from "@/types/gst";

/**
 * Generates a PDF Blob for the given invoice and items on the client side.
 */
export async function generateInvoicePdf(
  invoice: GstInvoice,
  items: GstInvoiceItem[]
): Promise<Blob> {
  const element = React.createElement(InvoicePdf, { invoice, items }) as React.ReactElement<DocumentProps>;
  return await pdf(element).toBlob();
}

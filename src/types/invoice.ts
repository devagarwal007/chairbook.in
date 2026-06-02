import type { WhatsAppDeliveryStatus } from "./gst";

export const INVOICE_PAGE_SIZE = 10;

export type InvoiceSort = "newest" | "oldest" | "amount_desc" | "amount_asc";

export type InvoicePaymentMethodFilter =
  | "all"
  | "upi"
  | "card"
  | "cash"
  | "due"
  | "other";

export type GstInvoiceStatusFilter = "all" | WhatsAppDeliveryStatus;

export interface InvoiceListFilters {
  q: string;
  from: string;
  to: string;
  paymentMethod: InvoicePaymentMethodFilter;
  sort: InvoiceSort;
}

export interface GstInvoiceListFilters extends InvoiceListFilters {
  whatsappStatus: GstInvoiceStatusFilter;
}

export type BillingInvoiceListFilters = InvoiceListFilters;

export interface GstInvoiceListRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string | null;
  whatsapp_delivery_status: WhatsAppDeliveryStatus;
  share_token: string;
}

export interface BillingInvoiceListRow {
  id: string;
  date: string;
  plan_name: string;
  amount: number;
  payment_method: string;
}

export interface PaginatedInvoiceResponse<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

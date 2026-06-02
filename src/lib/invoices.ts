import {
  INVOICE_PAGE_SIZE,
  type BillingInvoiceListFilters,
  type GstInvoiceListFilters,
  type GstInvoiceStatusFilter,
  type InvoicePaymentMethodFilter,
  type InvoiceSort,
} from "../types/invoice";

export const DEFAULT_INVOICE_SORT: InvoiceSort = "newest";
export const DEFAULT_PAYMENT_METHOD_FILTER: InvoicePaymentMethodFilter = "all";
export const DEFAULT_GST_STATUS_FILTER: GstInvoiceStatusFilter = "all";

export const INVOICE_SORT_OPTIONS: { id: InvoiceSort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "amount_desc", label: "Amount high to low" },
  { id: "amount_asc", label: "Amount low to high" },
];

export const INVOICE_PAYMENT_FILTERS: { id: InvoicePaymentMethodFilter; label: string }[] = [
  { id: "all", label: "All payments" },
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "cash", label: "Cash" },
  { id: "due", label: "Due" },
  { id: "other", label: "Other" },
];

export const GST_DELIVERY_STATUS_FILTERS: { id: GstInvoiceStatusFilter; label: string }[] = [
  { id: "all", label: "All delivery" },
  { id: "not_available", label: "Not available" },
  { id: "pending", label: "Pending" },
  { id: "sent", label: "Sent" },
  { id: "delivered", label: "Delivered" },
  { id: "failed", label: "Failed" },
];

export const DEFAULT_BILLING_INVOICE_FILTERS: BillingInvoiceListFilters = {
  q: "",
  from: "",
  to: "",
  paymentMethod: DEFAULT_PAYMENT_METHOD_FILTER,
  sort: DEFAULT_INVOICE_SORT,
};

export const DEFAULT_GST_INVOICE_FILTERS: GstInvoiceListFilters = {
  ...DEFAULT_BILLING_INVOICE_FILTERS,
  whatsappStatus: DEFAULT_GST_STATUS_FILTER,
};

export function normalizeInvoiceSearchInput(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function sanitizeInvoiceSearchForQuery(value: string): string {
  return normalizeInvoiceSearchInput(value).replace(/[%,()*]/g, "");
}

export function formatInvoiceDate(value: string): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function formatInvoiceAmount(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function buildInvoiceSearchParams(
  filters: BillingInvoiceListFilters | GstInvoiceListFilters,
  page: number,
): URLSearchParams {
  const params = new URLSearchParams();
  const q = normalizeInvoiceSearchInput(filters.q);

  if (q) params.set("q", q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.paymentMethod !== "all") params.set("paymentMethod", filters.paymentMethod);
  if (filters.sort !== DEFAULT_INVOICE_SORT) params.set("sort", filters.sort);
  if ("whatsappStatus" in filters && filters.whatsappStatus !== "all") {
    params.set("whatsappStatus", filters.whatsappStatus);
  }
  params.set("page", String(Math.max(1, page)));
  params.set("pageSize", String(INVOICE_PAGE_SIZE));

  return params;
}

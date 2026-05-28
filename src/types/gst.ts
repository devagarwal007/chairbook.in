export type GstPricingMode = "tax_inclusive" | "tax_exclusive";

export type WhatsAppDeliveryStatus =
  | "not_available"
  | "pending"
  | "sent"
  | "delivered"
  | "failed";

export interface SalonGstSettings {
  id?: string;
  salon_id?: string;
  gst_enabled: boolean;
  gstin: string;
  legal_name: string;
  registered_address: string;
  state: string;
  state_code: string;
  gst_rate: number;
  sac_code: string;
  pricing_mode: GstPricingMode;
  invoice_prefix: string;
}

export interface GstInvoice {
  id: string;
  salon_id: string;
  booking_id: string;
  payment_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  financial_year: string;
  share_token: string;
  // Salon snapshot
  salon_legal_name: string;
  salon_gstin: string;
  salon_address: string | null;
  salon_state: string | null;
  salon_state_code: string | null;
  // Customer
  customer_name: string;
  customer_phone: string | null;
  // Optional B2B
  customer_gstin: string | null;
  customer_business_name: string | null;
  customer_billing_address: string | null;
  customer_billing_state: string | null;
  customer_billing_state_code: string | null;
  // Tax
  is_igst: boolean;
  sac_code: string;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  discount_amount: number;
  total_amount: number;
  // Payment
  payment_method: string | null;
  // Delivery
  whatsapp_delivery_status: WhatsAppDeliveryStatus;
  created_at: string;
}

export interface GstInvoiceItem {
  id?: string;
  invoice_id?: string;
  service_name: string;
  sac_code: string;
  qty: number;
  unit_price: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

/** Computed tax breakdown for UI display */
export interface GstTaxBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
  isIgst: boolean;
}

/** Per-item tax calculation result */
export interface GstItemTax {
  serviceName: string;
  sacCode: string;
  qty: number;
  unitPrice: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

/** B2B customer details (optional, collapsed by default) */
export interface B2BCustomerDetails {
  gstin: string;
  businessName: string;
  billingAddress: string;
  billingState: string;
  billingStateCode: string;
}

export const DEFAULT_GST_SETTINGS: SalonGstSettings = {
  gst_enabled: false,
  gstin: "",
  legal_name: "",
  registered_address: "",
  state: "",
  state_code: "",
  gst_rate: 18,
  sac_code: "999721",
  pricing_mode: "tax_exclusive",
  invoice_prefix: "SAL",
};

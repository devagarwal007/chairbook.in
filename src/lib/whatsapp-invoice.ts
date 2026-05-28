/**
 * WhatsApp Invoice Delivery — Pluggable Stub
 *
 * When the WhatsApp Business API is integrated, replace the stub
 * implementation below with real API calls. The interface stays
 * the same so the rest of the codebase doesn't change.
 */

import type { WhatsAppDeliveryStatus } from "@/types/gst";

export interface WhatsAppDeliveryResult {
  status: WhatsAppDeliveryStatus;
  message: string;
  messageId?: string;
}

export interface WhatsAppInvoiceDelivery {
  /** Send an invoice PDF link to a customer via WhatsApp */
  sendInvoice(
    invoiceId: string,
    phone: string,
    shareUrl: string
  ): Promise<WhatsAppDeliveryResult>;

  /** Check delivery status of a previously sent invoice */
  getDeliveryStatus(invoiceId: string): Promise<WhatsAppDeliveryStatus>;
}

/**
 * Current implementation: stub.
 * All methods return 'not_available' until WhatsApp API is configured.
 */
export const whatsAppInvoice: WhatsAppInvoiceDelivery = {
  async sendInvoice(
    _invoiceId: string,
    _phone: string,
    _shareUrl: string
  ): Promise<WhatsAppDeliveryResult> {
    return {
      status: "not_available",
      message: "WhatsApp Business API is not yet configured.",
    };
  },

  async getDeliveryStatus(
    _invoiceId: string
  ): Promise<WhatsAppDeliveryStatus> {
    return "not_available";
  },
};

/**
 * Build a shareable invoice PDF URL from a share token.
 * Works for both the owner sharing and the WhatsApp delivery.
 */
export function buildInvoiceShareUrl(shareToken: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/invoice/${shareToken}/pdf`;
  }
  // Server-side fallback
  return `/api/invoice/${shareToken}/pdf`;
}

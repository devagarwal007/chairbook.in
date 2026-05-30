export type WhatsAppTemplateCategory = "utility" | "marketing" | "authentication" | "service";

export interface WhatsAppTemplatePayload {
  salonId: string;
  to: string;
  templateKey: string;
  templateName: string;
  templateCategory: WhatsAppTemplateCategory;
  languageCode: string;
  bodyParameters: string[];
  bookingId?: string;
  customerId?: string;
  invoiceId?: string;
}

interface BookingConfirmationInput {
  salonId: string;
  to: string;
  bookingId?: string;
  customerId?: string;
  customerName: string;
  serviceNames: string[];
  dateLabel: string;
  time: string;
  stylistName: string;
}

type BookingReminderInput = BookingConfirmationInput;

interface ReceiptLinkInput {
  salonId: string;
  to: string;
  bookingId?: string;
  invoiceId?: string;
  customerName: string;
  invoiceUrl: string;
}

export function buildBookingConfirmationPayload(input: BookingConfirmationInput): WhatsAppTemplatePayload {
  return {
    salonId: input.salonId,
    to: input.to,
    bookingId: input.bookingId,
    customerId: input.customerId,
    templateKey: "booking_confirmation",
    templateName: "booking_confirmation",
    templateCategory: "utility",
    languageCode: "en",
    bodyParameters: [
      input.customerName,
      input.serviceNames.join(", "),
      input.dateLabel,
      input.time,
      input.stylistName,
    ],
  };
}

export function buildBookingReminderPayload(input: BookingReminderInput): WhatsAppTemplatePayload {
  return {
    salonId: input.salonId,
    to: input.to,
    bookingId: input.bookingId,
    customerId: input.customerId,
    templateKey: "booking_reminder",
    templateName: "booking_reminder",
    templateCategory: "utility",
    languageCode: "en",
    bodyParameters: [
      input.customerName,
      input.serviceNames.join(", "),
      input.dateLabel,
      input.time,
      input.stylistName,
    ],
  };
}

export function buildReceiptLinkPayload(input: ReceiptLinkInput): WhatsAppTemplatePayload {
  return {
    salonId: input.salonId,
    to: input.to,
    bookingId: input.bookingId,
    invoiceId: input.invoiceId,
    templateKey: "invoice_receipt",
    templateName: "invoice_receipt",
    templateCategory: "utility",
    languageCode: "en",
    bodyParameters: [input.customerName, input.invoiceUrl],
  };
}

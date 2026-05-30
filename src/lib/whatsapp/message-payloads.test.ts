import { describe, expect, it } from "vitest";
import {
  buildBookingConfirmationPayload,
  buildBookingReminderPayload,
  buildReceiptLinkPayload,
} from "./message-payloads";

describe("WhatsApp message payloads", () => {
  it("builds a utility booking confirmation payload", () => {
    const payload = buildBookingConfirmationPayload({
      salonId: "salon_1",
      to: "+91 98765 43210",
      bookingId: "booking_1",
      customerId: "customer_1",
      customerName: "Asha Rao",
      serviceNames: ["Haircut", "Hair Spa"],
      dateLabel: "Friday, 29 May",
      time: "16:30",
      stylistName: "Meera",
    });

    expect(payload).toEqual({
      salonId: "salon_1",
      to: "+91 98765 43210",
      bookingId: "booking_1",
      customerId: "customer_1",
      templateKey: "booking_confirmation",
      templateName: "booking_confirmation",
      templateCategory: "utility",
      languageCode: "en",
      bodyParameters: [
        "Asha Rao",
        "Haircut, Hair Spa",
        "Friday, 29 May",
        "16:30",
        "Meera",
      ],
    });
  });

  it("builds a utility receipt link payload", () => {
    const payload = buildReceiptLinkPayload({
      salonId: "salon_1",
      to: "9876543210",
      bookingId: "booking_1",
      customerName: "Asha Rao",
      invoiceUrl: "https://chairbook.test/api/invoice/token/pdf",
    });

    expect(payload).toEqual({
      salonId: "salon_1",
      to: "9876543210",
      bookingId: "booking_1",
      templateKey: "invoice_receipt",
      templateName: "invoice_receipt",
      templateCategory: "utility",
      languageCode: "en",
      bodyParameters: [
        "Asha Rao",
        "https://chairbook.test/api/invoice/token/pdf",
      ],
    });
  });

  it("builds a utility booking reminder payload", () => {
    const payload = buildBookingReminderPayload({
      salonId: "salon_1",
      to: "9876543210",
      bookingId: "booking_1",
      customerId: "customer_1",
      customerName: "Asha Rao",
      serviceNames: ["Haircut"],
      dateLabel: "Friday, 29 May",
      time: "16:30",
      stylistName: "Meera",
    });

    expect(payload.templateKey).toBe("booking_reminder");
    expect(payload.templateName).toBe("booking_reminder");
    expect(payload.templateCategory).toBe("utility");
    expect(payload.bodyParameters).toEqual([
      "Asha Rao",
      "Haircut",
      "Friday, 29 May",
      "16:30",
      "Meera",
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { buildTemplateMessagePayload, sendWhatsAppTemplate } from "./meta-client";

describe("Meta Cloud API client", () => {
  it("builds an approved template payload for utility notifications", () => {
    expect(buildTemplateMessagePayload({
      to: "919876543210",
      templateName: "booking_confirmation",
      languageCode: "en",
      bodyParameters: ["Priya", "24 May", "4:00 PM"],
    })).toEqual({
      messaging_product: "whatsapp",
      to: "919876543210",
      type: "template",
      template: {
        name: "booking_confirmation",
        language: { code: "en" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: "Priya" },
            { type: "text", text: "24 May" },
            { type: "text", text: "4:00 PM" },
          ],
        }],
      },
    });
  });

  it("sanitizes Meta send failures before returning them to app code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Raw Meta token failure", code: 190 } }),
    });

    const result = await sendWhatsAppTemplate({
      fetchImpl: fetchMock,
      graphApiVersion: "v24.0",
      phoneNumberId: "123",
      accessToken: "secret-access-token",
      to: "919876543210",
      templateName: "booking_confirmation",
      languageCode: "en",
      bodyParameters: ["Priya"],
    });

    expect(result).toMatchObject({
      ok: false,
      status: "failed",
      userMessage: "WhatsApp message could not be sent. Please check channel setup and try again.",
    });
    expect(JSON.stringify(result)).not.toContain("secret-access-token");
    expect(JSON.stringify(result)).not.toContain("Raw Meta token failure");
  });
});

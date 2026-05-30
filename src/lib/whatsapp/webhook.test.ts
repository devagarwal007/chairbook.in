import { describe, expect, it } from "vitest";
import { parseWhatsAppWebhookEvents } from "./webhook";

describe("parseWhatsAppWebhookEvents", () => {
  it("extracts inbound customer messages and delivery statuses from Meta webhooks", () => {
    const events = parseWhatsAppWebhookEvents({
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: "phone_1", display_phone_number: "919999999999" },
            messages: [{
              id: "wamid.inbound",
              from: "919876543210",
              timestamp: "1779990000",
              type: "text",
              text: { body: "YES" },
            }],
            statuses: [{
              id: "wamid.outbound",
              status: "delivered",
              timestamp: "1779990100",
              conversation: { id: "conversation_1" },
            }],
          },
        }],
      }],
    });

    expect(events).toEqual([
      expect.objectContaining({
        eventId: "message:wamid.inbound",
        eventType: "message",
        metaMessageId: "wamid.inbound",
        fromPhone: "919876543210",
        body: "YES",
      }),
      expect.objectContaining({
        eventId: "status:wamid.outbound:delivered:1779990100",
        eventType: "status",
        metaMessageId: "wamid.outbound",
        status: "delivered",
        conversationId: "conversation_1",
      }),
    ]);
  });
});

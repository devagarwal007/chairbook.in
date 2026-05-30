export type ParsedWhatsAppWebhookEvent = {
  eventId: string;
  eventType: "message" | "status";
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  metaMessageId: string;
  fromPhone?: string;
  body?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  conversationId?: string;
  timestamp?: string;
};

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
          display_phone_number?: string;
        };
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: "sent" | "delivered" | "read" | "failed";
          timestamp?: string;
          conversation?: { id?: string };
        }>;
      };
    }>;
  }>;
};

export function parseWhatsAppWebhookEvents(payload: MetaWebhookPayload): ParsedWhatsAppWebhookEvent[] {
  const events: ParsedWhatsAppWebhookEvent[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      const displayPhoneNumber = value.metadata?.display_phone_number;

      for (const message of value.messages || []) {
        if (!message.id) continue;
        events.push({
          eventId: `message:${message.id}`,
          eventType: "message",
          phoneNumberId,
          displayPhoneNumber,
          metaMessageId: message.id,
          fromPhone: message.from,
          body: message.text?.body,
          timestamp: message.timestamp,
        });
      }

      for (const status of value.statuses || []) {
        if (!status.id || !status.status) continue;
        events.push({
          eventId: `status:${status.id}:${status.status}:${status.timestamp || ""}`,
          eventType: "status",
          phoneNumberId,
          displayPhoneNumber,
          metaMessageId: status.id,
          status: status.status,
          conversationId: status.conversation?.id,
          timestamp: status.timestamp,
        });
      }
    }
  }

  return events;
}

type FetchImpl = typeof fetch;

export interface TemplatePayloadInput {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
}

export interface SendWhatsAppTemplateInput extends TemplatePayloadInput {
  fetchImpl?: FetchImpl;
  graphApiVersion: string;
  phoneNumberId: string;
  accessToken: string;
}

export interface ExchangeEmbeddedSignupCodeInput {
  fetchImpl?: FetchImpl;
  graphApiVersion: string;
  appId: string;
  appSecret: string;
  code: string;
}

export interface SubscribeWabaInput {
  fetchImpl?: FetchImpl;
  graphApiVersion: string;
  wabaId: string;
  accessToken: string;
}

export type WhatsAppSendResult = {
  ok: true;
  status: "accepted";
  messageId: string;
} | {
  ok: false;
  status: "failed";
  userMessage: string;
  providerStatus?: number;
  providerCode?: number;
};

export function buildTemplateMessagePayload(input: TemplatePayloadInput) {
  const payload: {
    messaging_product: "whatsapp";
    to: string;
    type: "template";
    template: {
      name: string;
      language: { code: string };
      components?: Array<{
        type: "body";
        parameters: Array<{ type: "text"; text: string }>;
      }>;
    };
  } = {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
    },
  };

  if (input.bodyParameters?.length) {
    payload.template.components = [{
      type: "body",
      parameters: input.bodyParameters.map((text) => ({ type: "text", text })),
    }];
  }

  return payload;
}

export async function sendWhatsAppTemplate(input: SendWhatsAppTemplateInput): Promise<WhatsAppSendResult> {
  const fetchImpl = input.fetchImpl || fetch;
  const response = await fetchImpl(
    `https://graph.facebook.com/${input.graphApiVersion}/${input.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildTemplateMessagePayload(input)),
    }
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: "failed",
      userMessage: "WhatsApp message could not be sent. Please check channel setup and try again.",
      providerStatus: response.status,
      providerCode: typeof body?.error?.code === "number" ? body.error.code : undefined,
    };
  }

  const messageId = typeof body?.messages?.[0]?.id === "string" ? body.messages[0].id : "";
  return {
    ok: true,
    status: "accepted",
    messageId,
  };
}

export async function exchangeEmbeddedSignupCode(input: ExchangeEmbeddedSignupCodeInput) {
  const fetchImpl = input.fetchImpl || fetch;
  const params = new URLSearchParams({
    client_id: input.appId,
    client_secret: input.appSecret,
    code: input.code,
  });

  const response = await fetchImpl(`https://graph.facebook.com/${input.graphApiVersion}/oauth/access_token?${params.toString()}`, {
    method: "GET",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || typeof body?.access_token !== "string") {
    return {
      ok: false as const,
      userMessage: "WhatsApp connection could not be completed. Please try again.",
      providerStatus: response.status,
    };
  }

  return {
    ok: true as const,
    accessToken: body.access_token as string,
  };
}

export async function subscribeWabaToApp(input: SubscribeWabaInput) {
  const fetchImpl = input.fetchImpl || fetch;
  const response = await fetchImpl(`https://graph.facebook.com/${input.graphApiVersion}/${input.wabaId}/subscribed_apps`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  });

  if (!response.ok) {
    return {
      ok: false as const,
      userMessage: "WhatsApp webhooks could not be subscribed for this number.",
      providerStatus: response.status,
    };
  }

  return { ok: true as const };
}

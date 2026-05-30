import "server-only";

export interface WhatsAppServerConfig {
  graphApiVersion: string;
  metaAppId: string;
  embeddedSignupConfigId: string;
  metaAppSecret: string;
  webhookVerifyToken: string;
  tokenEncryptionKey: string;
  chairbookAccessToken: string;
  chairbookPhoneNumberId: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  cronSecret: string;
}

export function getWhatsAppServerConfig(): WhatsAppServerConfig {
  return {
    graphApiVersion: process.env.META_GRAPH_API_VERSION || "v24.0",
    metaAppId: process.env.META_APP_ID || "",
    embeddedSignupConfigId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || process.env.META_LOGIN_CONFIG_ID || "",
    metaAppSecret: process.env.META_APP_SECRET || "",
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
    tokenEncryptionKey: process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY || "",
    chairbookAccessToken: process.env.WHATSAPP_CHAIRBOOK_ACCESS_TOKEN || "",
    chairbookPhoneNumberId: process.env.WHATSAPP_CHAIRBOOK_PHONE_NUMBER_ID || "",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
    cronSecret: process.env.CRON_SECRET || "",
  };
}

export function missingConfig(config: Record<string, string>, keys: string[]) {
  return keys.filter((key) => !config[key]);
}

export const WHATSAPP_CREDIT_PACKS = {
  starter: { id: "starter", label: "Starter refill", credits: 500, amountPaise: 49900 },
  growth: { id: "growth", label: "Growth refill", credits: 1500, amountPaise: 129900 },
  pro: { id: "pro", label: "Pro refill", credits: 5000, amountPaise: 399900 },
} as const;

export type WhatsAppCreditPackId = keyof typeof WHATSAPP_CREDIT_PACKS;

export function getWhatsAppCreditPack(id: string) {
  return WHATSAPP_CREDIT_PACKS[id as WhatsAppCreditPackId] || null;
}

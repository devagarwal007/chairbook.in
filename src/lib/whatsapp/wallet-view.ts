export interface MessageCreditWalletRow {
  plan_credits: number;
  refill_credits: number;
  reserved_plan_credits: number;
  reserved_refill_credits: number;
  reset_period_start: string | null;
  reset_period_end: string | null;
}

export interface MessageCreditWalletSummary {
  planCredits: number;
  refillCredits: number;
  reservedCredits: number;
  availableCredits: number;
  resetPeriodStart: string | null;
  resetPeriodEnd: string | null;
}

export function buildWalletSummary(wallet: MessageCreditWalletRow | null | undefined): MessageCreditWalletSummary {
  const planCredits = Number(wallet?.plan_credits || 0);
  const refillCredits = Number(wallet?.refill_credits || 0);
  const reservedCredits = Number(wallet?.reserved_plan_credits || 0) + Number(wallet?.reserved_refill_credits || 0);

  return {
    planCredits,
    refillCredits,
    reservedCredits,
    availableCredits: Math.max(0, planCredits + refillCredits - reservedCredits),
    resetPeriodStart: wallet?.reset_period_start || null,
    resetPeriodEnd: wallet?.reset_period_end || null,
  };
}

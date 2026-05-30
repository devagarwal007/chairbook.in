export type MessageCreditAction = "reserve" | "consume" | "release" | "topup" | "monthly_grant";

export interface MessageCreditWallet {
  planCredits: number;
  refillCredits: number;
  reservedPlanCredits: number;
  reservedRefillCredits: number;
}

export interface MessageCreditLedgerEntry {
  messageId: string;
  action: MessageCreditAction;
  planCredits: number;
  refillCredits: number;
}

export interface MessageCreditMutation {
  wallet: MessageCreditWallet;
  ledgerEntry: MessageCreditLedgerEntry;
}

export function getAvailableCredits(wallet: MessageCreditWallet): number {
  return Math.max(0, wallet.planCredits - wallet.reservedPlanCredits)
    + Math.max(0, wallet.refillCredits - wallet.reservedRefillCredits);
}

export function reserveMessageCredits(
  wallet: MessageCreditWallet,
  amount: number,
  messageId: string
): MessageCreditMutation {
  assertPositiveAmount(amount);

  if (getAvailableCredits(wallet) < amount) {
    throw new Error("Insufficient WhatsApp credits");
  }

  const availablePlanCredits = Math.max(0, wallet.planCredits - wallet.reservedPlanCredits);
  const planCredits = Math.min(amount, availablePlanCredits);
  const refillCredits = amount - planCredits;

  return {
    wallet: {
      ...wallet,
      reservedPlanCredits: wallet.reservedPlanCredits + planCredits,
      reservedRefillCredits: wallet.reservedRefillCredits + refillCredits,
    },
    ledgerEntry: {
      messageId,
      action: "reserve",
      planCredits,
      refillCredits,
    },
  };
}

export function consumeReservedCredits(
  wallet: MessageCreditWallet,
  amount: number,
  messageId: string
): MessageCreditMutation {
  const allocation = allocateFromReserved(wallet, amount);

  return {
    wallet: {
      ...wallet,
      planCredits: wallet.planCredits - allocation.planCredits,
      refillCredits: wallet.refillCredits - allocation.refillCredits,
      reservedPlanCredits: wallet.reservedPlanCredits - allocation.planCredits,
      reservedRefillCredits: wallet.reservedRefillCredits - allocation.refillCredits,
    },
    ledgerEntry: {
      messageId,
      action: "consume",
      ...allocation,
    },
  };
}

export function releaseReservedCredits(
  wallet: MessageCreditWallet,
  amount: number,
  messageId: string
): MessageCreditMutation {
  const allocation = allocateFromReserved(wallet, amount);

  return {
    wallet: {
      ...wallet,
      reservedPlanCredits: wallet.reservedPlanCredits - allocation.planCredits,
      reservedRefillCredits: wallet.reservedRefillCredits - allocation.refillCredits,
    },
    ledgerEntry: {
      messageId,
      action: "release",
      ...allocation,
    },
  };
}

function allocateFromReserved(wallet: MessageCreditWallet, amount: number) {
  assertPositiveAmount(amount);

  const reserved = wallet.reservedPlanCredits + wallet.reservedRefillCredits;
  if (reserved < amount) {
    throw new Error("Insufficient reserved WhatsApp credits");
  }

  const planCredits = Math.min(amount, wallet.reservedPlanCredits);
  return {
    planCredits,
    refillCredits: amount - planCredits,
  };
}

function assertPositiveAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("WhatsApp credit amount must be a positive integer");
  }
}

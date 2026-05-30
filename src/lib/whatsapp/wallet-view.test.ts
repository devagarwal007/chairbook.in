import { describe, expect, it } from "vitest";
import { buildWalletSummary } from "./wallet-view";

describe("WhatsApp wallet view", () => {
  it("summarizes the applied message_credit_wallets schema", () => {
    const summary = buildWalletSummary({
      plan_credits: 120,
      refill_credits: 40,
      reserved_plan_credits: 10,
      reserved_refill_credits: 5,
      reset_period_start: "2026-05-01",
      reset_period_end: "2026-05-31",
    });

    expect(summary).toEqual({
      planCredits: 120,
      refillCredits: 40,
      reservedCredits: 15,
      availableCredits: 145,
      resetPeriodStart: "2026-05-01",
      resetPeriodEnd: "2026-05-31",
    });
  });
});

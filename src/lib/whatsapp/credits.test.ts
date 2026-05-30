import { describe, expect, it } from "vitest";
import {
  consumeReservedCredits,
  getAvailableCredits,
  releaseReservedCredits,
  reserveMessageCredits,
  type MessageCreditWallet,
} from "./credits";

const wallet = (patch: Partial<MessageCreditWallet> = {}): MessageCreditWallet => ({
  planCredits: 5,
  refillCredits: 2,
  reservedPlanCredits: 0,
  reservedRefillCredits: 0,
  ...patch,
});

describe("message credit wallet", () => {
  it("reserves plan credits first, then refill credits", () => {
    const result = reserveMessageCredits(wallet(), 6, "msg_1");

    expect(result.wallet).toMatchObject({
      planCredits: 5,
      refillCredits: 2,
      reservedPlanCredits: 5,
      reservedRefillCredits: 1,
    });
    expect(getAvailableCredits(result.wallet)).toBe(1);
    expect(result.ledgerEntry).toMatchObject({
      messageId: "msg_1",
      action: "reserve",
      planCredits: 5,
      refillCredits: 1,
    });
  });

  it("consumes only previously reserved credits", () => {
    const reserved = reserveMessageCredits(wallet(), 6, "msg_1").wallet;
    const result = consumeReservedCredits(reserved, 6, "msg_1");

    expect(result.wallet).toMatchObject({
      planCredits: 0,
      refillCredits: 1,
      reservedPlanCredits: 0,
      reservedRefillCredits: 0,
    });
    expect(result.ledgerEntry.action).toBe("consume");
  });

  it("releases reserved credits without reducing the wallet balance", () => {
    const reserved = reserveMessageCredits(wallet(), 3, "msg_1").wallet;
    const result = releaseReservedCredits(reserved, 3, "msg_1");

    expect(result.wallet).toMatchObject({
      planCredits: 5,
      refillCredits: 2,
      reservedPlanCredits: 0,
      reservedRefillCredits: 0,
    });
    expect(getAvailableCredits(result.wallet)).toBe(7);
  });

  it("blocks reservations when available credits are exhausted", () => {
    expect(() => reserveMessageCredits(wallet({ planCredits: 0, refillCredits: 0 }), 1, "msg_1"))
      .toThrow("Insufficient WhatsApp credits");
  });
});

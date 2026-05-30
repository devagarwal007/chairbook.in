import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "./razorpay";

describe("verifyRazorpayPaymentSignature", () => {
  it("accepts a valid Razorpay payment signature and rejects tampering", () => {
    const orderId = "order_123";
    const paymentId = "pay_456";
    const secret = "razorpay_secret";
    const signature = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifyRazorpayPaymentSignature({ orderId, paymentId, signature }, secret)).toBe(true);
    expect(verifyRazorpayPaymentSignature({ orderId, paymentId: "pay_tampered", signature }, secret)).toBe(false);
  });
});

describe("verifyRazorpayWebhookSignature", () => {
  it("verifies raw webhook bodies without parsing first", () => {
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const secret = "webhook_secret";
    const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(verifyRazorpayWebhookSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyRazorpayWebhookSignature(rawBody, "bad", secret)).toBe(false);
  });
});

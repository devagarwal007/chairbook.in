import { createHmac, timingSafeEqual } from "node:crypto";

export interface RazorpayPaymentSignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export function verifyRazorpayPaymentSignature(input: RazorpayPaymentSignatureInput, secret: string): boolean {
  if (!input.orderId || !input.paymentId || !input.signature || !secret) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(input.signature);

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

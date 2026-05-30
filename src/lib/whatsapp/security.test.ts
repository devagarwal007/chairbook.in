import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  verifyMetaWebhookSignature,
  verifyWebhookChallenge,
} from "./security";

describe("WhatsApp security helpers", () => {
  it("verifies Meta webhook signatures with the app secret", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    const appSecret = "meta_app_secret";
    const signature = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;

    expect(verifyMetaWebhookSignature(rawBody, signature, appSecret)).toBe(true);
    expect(verifyMetaWebhookSignature(rawBody, "sha256=bad", appSecret)).toBe(false);
  });

  it("returns the challenge only when Meta's verify token matches", () => {
    const query = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "correct",
      "hub.challenge": "challenge-123",
    });

    expect(verifyWebhookChallenge(query, "correct")).toBe("challenge-123");
    expect(verifyWebhookChallenge(query, "wrong")).toBeNull();
  });

  it("encrypts and decrypts tokens without storing the raw secret", () => {
    const key = "0123456789abcdef0123456789abcdef";
    const encrypted = encryptSecret("token-secret", key);

    expect(encrypted).not.toContain("token-secret");
    expect(decryptSecret(encrypted, key)).toBe("token-secret");
    expect(() => decryptSecret(encrypted, "abcdef0123456789abcdef0123456789")).toThrow();
  });
});

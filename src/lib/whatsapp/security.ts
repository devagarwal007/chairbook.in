import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ENCRYPTION_VERSION = "v1";

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=") || !appSecret) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return constantTimeEqual(signatureHeader, expected);
}

export function verifyWebhookChallenge(query: URLSearchParams, verifyToken: string): string | null {
  const mode = query.get("hub.mode");
  const token = query.get("hub.verify_token");
  const challenge = query.get("hub.challenge");

  if (mode === "subscribe" && token && challenge && constantTimeEqual(token, verifyToken)) {
    return challenge;
  }

  return null;
}

export function encryptSecret(secret: string, encryptionKey: string): string {
  const key = normalizeEncryptionKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(encryptedSecret: string, encryptionKey: string): string {
  const [version, ivText, authTagText, encryptedText] = encryptedSecret.split(":");

  if (version !== ENCRYPTION_VERSION || !ivText || !authTagText || !encryptedText) {
    throw new Error("Unsupported encrypted secret format");
  }

  const key = normalizeEncryptionKey(encryptionKey);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function normalizeEncryptionKey(encryptionKey: string): Buffer {
  const raw = Buffer.from(encryptionKey, "utf8");
  if (raw.length !== 32) {
    throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY must be 32 bytes");
  }

  return raw;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

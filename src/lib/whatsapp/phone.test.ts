import { describe, expect, it } from "vitest";
import { normalizeWhatsAppPhone } from "./phone";

describe("normalizeWhatsAppPhone", () => {
  it("normalizes Indian salon/customer phones to Meta's digits-only E.164 format", () => {
    expect(normalizeWhatsAppPhone("98765 43210")).toBe("919876543210");
    expect(normalizeWhatsAppPhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizeWhatsAppPhone("091-98765-43210")).toBe("919876543210");
  });

  it("rejects phones that are too short for WhatsApp delivery", () => {
    expect(() => normalizeWhatsAppPhone("12345")).toThrow("Invalid WhatsApp phone number");
  });
});

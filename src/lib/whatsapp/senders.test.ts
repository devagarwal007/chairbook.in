import { describe, expect, it } from "vitest";
import {
  getWhatsAppSenderPreference,
  selectWhatsappSender,
  type WhatsAppChannel,
} from "./senders";

const channel = (patch: Partial<WhatsAppChannel>): WhatsAppChannel => ({
  id: "channel",
  salonId: "salon_1",
  mode: "salon_owned",
  status: "active",
  creditLineStatus: "active",
  phoneNumberId: "phone_1",
  displayNumber: "+91 98765 43210",
  ...patch,
});

describe("selectWhatsappSender", () => {
  it("defaults to the ChairBook sender when both senders are usable", () => {
    const selected = selectWhatsappSender([
      channel({ id: "fallback", mode: "chairbook_fallback", phoneNumberId: "phone_fallback" }),
      channel({ id: "salon", mode: "salon_owned", phoneNumberId: "phone_salon" }),
    ]);

    expect(selected?.id).toBe("fallback");
    expect(selected?.phoneNumberId).toBe("phone_fallback");
  });

  it("uses the salon-owned sender only when the salon explicitly selected it", () => {
    const selected = selectWhatsappSender([
      channel({ id: "fallback", mode: "chairbook_fallback", phoneNumberId: "phone_fallback" }),
      channel({ id: "salon", mode: "salon_owned", phoneNumberId: "phone_salon" }),
    ], "salon_owned");

    expect(selected?.id).toBe("salon");
    expect(selected?.phoneNumberId).toBe("phone_salon");
  });

  it("falls back to ChairBook when the selected salon-owned sender is broken", () => {
    const selected = selectWhatsappSender([
      channel({ id: "salon", mode: "salon_owned", status: "error" }),
      channel({ id: "fallback", mode: "chairbook_fallback", phoneNumberId: "phone_fallback" }),
    ], "salon_owned");

    expect(selected?.id).toBe("fallback");
  });

  it("does not silently use a salon-owned sender when ChairBook is selected but unavailable", () => {
    const selected = selectWhatsappSender([
      channel({ id: "salon", mode: "salon_owned", phoneNumberId: "phone_salon" }),
    ], "chairbook");

    expect(selected).toBeNull();
  });

  it("returns null when every sender is inactive or missing credit line access", () => {
    const selected = selectWhatsappSender([
      channel({ status: "active", creditLineStatus: "pending" }),
      channel({ mode: "chairbook_fallback", status: "inactive" }),
    ]);

    expect(selected).toBeNull();
  });
});

describe("getWhatsAppSenderPreference", () => {
  it("defaults missing and invalid settings to ChairBook", () => {
    expect(getWhatsAppSenderPreference(null)).toBe("chairbook");
    expect(getWhatsAppSenderPreference({ senderPreference: "bad" })).toBe("chairbook");
  });

  it("reads an explicit salon-owned preference from wa_settings", () => {
    expect(getWhatsAppSenderPreference({ senderPreference: "salon_owned" })).toBe("salon_owned");
  });
});

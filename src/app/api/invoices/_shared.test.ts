import { describe, expect, it } from "vitest";
import { parseInvoiceParams } from "./_shared";

describe("invoice API parameter parsing", () => {
  it("caps page size and sanitizes search input", () => {
    const parsed = parseInvoiceParams("https://chairbook.test/api/invoices/gst?q=SAL,(2627)&page=2&pageSize=500", {
      includeWhatsappStatus: true,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.params.q).toBe("SAL2627");
      expect(parsed.params.page).toBe(2);
      expect(parsed.params.pageSize).toBe(10);
    }
  });

  it("rejects invalid date ranges", () => {
    const parsed = parseInvoiceParams("https://chairbook.test/api/invoices/billing?from=2026-06-02&to=2026-06-01", {
      includeWhatsappStatus: false,
    });

    expect(parsed.ok).toBe(false);
  });

  it("rejects GST delivery statuses on the GST endpoint only when invalid", () => {
    const parsed = parseInvoiceParams("https://chairbook.test/api/invoices/gst?whatsappStatus=missing", {
      includeWhatsappStatus: true,
    });

    expect(parsed.ok).toBe(false);
  });
});

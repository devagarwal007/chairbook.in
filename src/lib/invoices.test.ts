import { describe, expect, it } from "vitest";
import {
  DEFAULT_GST_INVOICE_FILTERS,
  buildInvoiceSearchParams,
  sanitizeInvoiceSearchForQuery,
} from "./invoices";

describe("invoice helpers", () => {
  it("strips PostgREST control characters from search text", () => {
    expect(sanitizeInvoiceSearchForQuery("SAL,(2627)*%")).toBe("SAL2627");
  });

  it("only serializes non-default invoice filters", () => {
    const params = buildInvoiceSearchParams({
      ...DEFAULT_GST_INVOICE_FILTERS,
      q: "Anjali",
      paymentMethod: "upi",
      whatsappStatus: "failed",
    }, 3);

    expect(params.get("q")).toBe("Anjali");
    expect(params.get("paymentMethod")).toBe("upi");
    expect(params.get("whatsappStatus")).toBe("failed");
    expect(params.get("sort")).toBeNull();
    expect(params.get("page")).toBe("3");
    expect(params.get("pageSize")).toBe("10");
  });
});

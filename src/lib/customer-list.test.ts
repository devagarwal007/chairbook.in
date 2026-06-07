import { describe, expect, it } from "vitest";
import { buildCustomerSearchFilter, sanitizeCustomerSearchForQuery } from "./customer-list";

describe("sanitizeCustomerSearchForQuery", () => {
  it("strips PostgREST control characters from customer search text", () => {
    expect(sanitizeCustomerSearchForQuery("Priya,(91)*%")).toBe("Priya91");
  });
});

describe("buildCustomerSearchFilter", () => {
  it("builds a name and phone OR filter for Supabase", () => {
    expect(buildCustomerSearchFilter("  Priya  ")).toBe("name.ilike.%Priya%,phone.ilike.%Priya%");
  });

  it("returns null for blank or fully stripped input", () => {
    expect(buildCustomerSearchFilter("   ")).toBeNull();
    expect(buildCustomerSearchFilter("(%),")).toBeNull();
  });
});

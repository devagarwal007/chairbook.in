import { describe, expect, it } from "vitest";
import { clampPaginationPage, getPaginationPageCount, paginationRange } from "./usePagination";

describe("paginationRange", () => {
  it("returns inclusive Supabase ranges for one-indexed pages", () => {
    expect(paginationRange(1, 20)).toEqual({ from: 0, to: 19 });
    expect(paginationRange(3, 20)).toEqual({ from: 40, to: 59 });
  });

  it("guards invalid page and page size values", () => {
    expect(paginationRange(0, 20)).toEqual({ from: 0, to: 19 });
    expect(paginationRange(2, 0)).toEqual({ from: 1, to: 1 });
  });
});

describe("getPaginationPageCount", () => {
  it("keeps empty result sets on page one", () => {
    expect(getPaginationPageCount(0, 20)).toBe(1);
  });

  it("rounds partial pages up", () => {
    expect(getPaginationPageCount(41, 20)).toBe(3);
  });
});

describe("clampPaginationPage", () => {
  it("keeps requested pages inside available bounds", () => {
    expect(clampPaginationPage(-2, 5)).toBe(1);
    expect(clampPaginationPage(3, 5)).toBe(3);
    expect(clampPaginationPage(9, 5)).toBe(5);
  });
});

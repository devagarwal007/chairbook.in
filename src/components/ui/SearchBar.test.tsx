import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("uses a text input with searchbox semantics so only the custom clear button is shown", () => {
    const markup = renderToStaticMarkup(
      <SearchBar value="98" onChange={vi.fn()} placeholder="Search bookings" aria-label="Search list bookings" />,
    );

    expect(markup).toContain('type="text"');
    expect(markup).toContain('role="searchbox"');
    expect(markup).toContain('aria-label="Search list bookings"');
    expect(markup).toContain('aria-label="Clear search"');
    expect(markup).not.toContain('type="search"');
  });
});

import { describe, expect, it } from "vitest";
import { describeNotificationError } from "./notification-errors";

describe("notification helpers", () => {
  it("formats Supabase errors without dumping empty objects", () => {
    expect(
      describeNotificationError({
        code: "42501",
        message: "new row violates row-level security policy",
      })
    ).toBe("new row violates row-level security policy (42501)");

    expect(describeNotificationError({})).toBe("Unknown notification insert error");
  });
});

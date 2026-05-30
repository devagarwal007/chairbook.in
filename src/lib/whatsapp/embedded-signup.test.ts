import { describe, expect, it } from "vitest";
import { extractEmbeddedSignupCode, parseEmbeddedSignupMessage } from "./embedded-signup";

describe("Meta Embedded Signup helpers", () => {
  it("extracts the authorization code from the Facebook login callback", () => {
    expect(extractEmbeddedSignupCode({ authResponse: { code: "AUTH_CODE" } })).toBe("AUTH_CODE");
  });

  it("parses the WhatsApp Embedded Signup FINISH message", () => {
    const info = parseEmbeddedSignupMessage(JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: {
        waba_id: "123456",
        phone_number_id: "7890",
        business_id: "biz_1",
        display_phone_number: "+91 98765 43210",
      },
    }));

    expect(info).toEqual({
      wabaId: "123456",
      phoneNumberId: "7890",
      businessAccountId: "biz_1",
      displayNumber: "+91 98765 43210",
    });
  });

  it("ignores non-finish signup messages", () => {
    expect(parseEmbeddedSignupMessage(JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: {},
    }))).toBeNull();
  });
});

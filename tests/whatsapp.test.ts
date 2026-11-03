import { describe, expect, it } from "vitest";
import { whatsappNumber, whatsappUrl } from "@/lib/whatsapp";

describe("whatsappNumber", () => {
  it("adds the country code to a national number", () => {
    expect(whatsappNumber("06 12345678", "Europe/Amsterdam")).toBe("31612345678");
    expect(whatsappNumber("06-1234 5678", "Europe/Amsterdam")).toBe("31612345678");
    expect(whatsappNumber("07700 900123", "Europe/London")).toBe("447700900123");
  });

  it("keeps international numbers as they are", () => {
    expect(whatsappNumber("+31 6 12345678", "Europe/London")).toBe("31612345678");
    expect(whatsappNumber("0031 6 12345678", "UTC")).toBe("31612345678");
  });

  it("gives up on numbers it can't read", () => {
    expect(whatsappNumber("", "Europe/Amsterdam")).toBeNull();
    expect(whatsappNumber("call me", "Europe/Amsterdam")).toBeNull();
    expect(whatsappNumber("06 12345678", "America/New_York")).toBeNull();
    expect(whatsappNumber("612345678", "Europe/Amsterdam")).toBeNull();
    expect(whatsappNumber("+31 6", "Europe/Amsterdam")).toBeNull();
  });
});

describe("whatsappUrl", () => {
  it("encodes the message", () => {
    expect(whatsappUrl("31612345678", "Hi & bye")).toBe("https://wa.me/31612345678?text=Hi%20%26%20bye");
    expect(whatsappUrl("31612345678")).toBe("https://wa.me/31612345678");
  });
});

import { describe, expect, it } from "vitest";
import {
  activeNumber,
  autoChannelFor,
  DEFAULT_AUTO_SEND,
  DEFAULT_WHATSAPP_NUMBERS,
  parseWhatsAppLines,
  whatsAppLines,
} from "./channels";

describe("automatic sending", () => {
  it("is on, on both channels, as the legacy office had it", () => {
    expect(DEFAULT_AUTO_SEND).toEqual({ enabled: true, channel: "both" });
  });
  it("picks WhatsApp when allowed and known, else e-mail, else nothing", () => {
    const both = { enabled: true, channel: "both" as const };
    expect(autoChannelFor(both, { email: "a@b.be", whatsapp: "+32470000000" })).toBe("whatsapp");
    expect(autoChannelFor(both, { email: "a@b.be", whatsapp: null })).toBe("email");
    expect(autoChannelFor(both, { email: null, whatsapp: null })).toBeNull();
    expect(
      autoChannelFor({ enabled: true, channel: "email" }, { email: "a@b.be", whatsapp: "+32" }),
    ).toBe("email");
    expect(
      autoChannelFor({ enabled: true, channel: "whatsapp" }, { email: "a@b.be", whatsapp: null }),
    ).toBeNull();
    expect(
      autoChannelFor({ enabled: false, channel: "both" }, { email: "a@b.be", whatsapp: "+32" }),
    ).toBeNull();
  });
});

describe("the WhatsApp numbers", () => {
  it("default to the legacy main number, active", () => {
    expect(activeNumber(DEFAULT_WHATSAPP_NUMBERS)?.number).toBe("+32 23 15 14 15");
    expect(activeNumber([])).toBeNull();
  });
  it("round-trip their lines and refuse a bad number, two active, or a duplicate", () => {
    const { numbers, problems } = parseWhatsAppLines(whatsAppLines(DEFAULT_WHATSAPP_NUMBERS));
    expect(problems).toEqual([]);
    expect(numbers).toEqual(DEFAULT_WHATSAPP_NUMBERS);
    expect(parseWhatsAppLines("Docs | +32 470 00 00 00 | 1234567890 | no").numbers[0]).toEqual({
      label: "Docs",
      number: "+32 470 00 00 00",
      phoneId: "1234567890",
      active: false,
    });
    expect(parseWhatsAppLines("Docs | hello").problems[0]).toMatch(/phone number/);
    expect(parseWhatsAppLines("Docs | +32 470 00 00 00 | abc").problems[0]).toMatch(/phone id/);
    expect(
      parseWhatsAppLines("A | +32 111111 | | yes\nB | +32 222222 | | yes").problems[0],
    ).toMatch(/One number/);
    expect(parseWhatsAppLines("A | +32 111111 | | yes\nB | +32 111111 | | no").problems[0]).toMatch(
      /twice/,
    );
  });
});

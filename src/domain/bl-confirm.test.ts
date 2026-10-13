import { describe, expect, it } from "vitest";
import { blNote, blProblem } from "./bl-confirm";

describe("the B/L confirmation", () => {
  it("takes a plain confirmation on any channel", () => {
    expect(blProblem("ok", "call", "")).toBeNull();
    expect(blNote("ok", "call", "")).toBe("confirmed by Phone call");
    expect(blNote("ok", "email", "")).toBe("confirmed by Email — copy kept");
  });

  it("refuses a correction agreed by phone, or with nothing written down", () => {
    expect(blProblem("fix", "call", "consignee address")).toMatch(/WhatsApp or email/);
    expect(blProblem("fix", "whatsapp", "  ")).toMatch(/Write down/);
    expect(blProblem("fix", "whatsapp", "weight on box 2")).toBeNull();
    expect(blNote("fix", "whatsapp", " weight on box 2 ")).toBe(
      "correction wanted: weight on box 2",
    );
  });
});

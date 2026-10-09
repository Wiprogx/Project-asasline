import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATES,
  fillTemplate,
  placeholdersOf,
  signed,
  TEMPLATE_PLACEHOLDERS,
  templateScope,
} from "./templates";

describe("fillTemplate", () => {
  it("fills every placeholder from the file", () => {
    expect(fillTemplate("{ref} — sailed {etd}", { ref: "SB2609001", etd: "2026-09-30" })).toBe(
      "SB2609001 — sailed 2026-09-30",
    );
  });

  it("shows a dash where the file has nothing, never an empty gap", () => {
    expect(fillTemplate("Vessel {vessel} {voyage}", { vessel: "MSC ROMA", voyage: " " })).toBe(
      "Vessel MSC ROMA —",
    );
    expect(fillTemplate("{unknown}", {})).toBe("—");
  });
});

describe("the default templates", () => {
  it("use only placeholders their record fills", () => {
    for (const t of DEFAULT_TEMPLATES) {
      const known = new Set<string>(TEMPLATE_PLACEHOLDERS[templateScope(t.code)]);
      expect(placeholdersOf(t.subject + t.body).filter((p) => !known.has(p))).toEqual([]);
    }
  });

  it("include the quotation letter in English, French and Dutch, scoped to quotations", () => {
    const codes = DEFAULT_TEMPLATES.filter((t) => templateScope(t.code) === "quotation").map(
      (t) => t.code,
    );
    expect(codes).toEqual(["QUOTE_OUT", "QUOTE_OUT_FR", "QUOTE_OUT_NL"]);
  });

  it("use only placeholders the booking screen fills (booking ones)", () => {
    const known = new Set([
      "client",
      "ref",
      "dest",
      "pol",
      "containers",
      "vessel",
      "voyage",
      "etd",
      "eta",
      "docName",
      "customs",
      "portcut",
      "loadDate",
      "loadTime",
      "loadAddress",
      "me",
      "sign",
    ]);
    for (const t of DEFAULT_TEMPLATES.filter((x) => templateScope(x.code) === "booking"))
      expect(placeholdersOf(t.subject + t.body).filter((p) => !known.has(p))).toEqual([]);
  });
});

describe("signed", () => {
  it("ends a letter with the signature once, and leaves one already signed alone", () => {
    expect(signed("Hello", "Sam — ASASLINE S.A.\nBrussels")).toBe(
      "Hello\n\nSam — ASASLINE S.A.\nBrussels",
    );
    expect(signed("Hello\n\nSam — ASASLINE S.A.\nBrussels", "Sam — ASASLINE S.A.\nBrussels")).toBe(
      "Hello\n\nSam — ASASLINE S.A.\nBrussels",
    );
    expect(signed("Hello", "  ")).toBe("Hello");
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, fillTemplate, placeholdersOf } from "./templates";

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
  it("use only placeholders the booking screen fills", () => {
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
    ]);
    for (const t of DEFAULT_TEMPLATES)
      expect(placeholdersOf(t.subject + t.body).filter((p) => !known.has(p))).toEqual([]);
  });
});

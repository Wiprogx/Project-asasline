import { describe, expect, it } from "vitest";
import { exemptionProofMissing, provesExport } from "./exemption";

describe("the export proof behind an exempt invoice", () => {
  it("is the final EX-A or a final bill of lading, never a draft", () => {
    expect(provesExport("EXA", "final")).toBe(true);
    expect(provesExport("exa", "final")).toBe(true);
    expect(provesExport("BL", "final")).toBe(true);
    expect(provesExport("OBL", "final")).toBe(true);
    expect(provesExport("BL_DRAFT", "final")).toBe(false);
    expect(provesExport("EXA", "draft")).toBe(false);
    expect(provesExport("INVOICE", "final")).toBe(false);
    expect(provesExport(null, "final")).toBe(false);
  });

  it("is missing only when a line is exempt and nothing on file proves the export", () => {
    const exempt = [{ vatCode: "EX41" }, { vatCode: "S21" }];
    expect(exemptionProofMissing(exempt, [])).toBe(true);
    expect(exemptionProofMissing(exempt, [{ code: "BL_DRAFT", stage: "final" }])).toBe(true);
    expect(exemptionProofMissing(exempt, [{ code: "EXA", stage: "final" }])).toBe(false);
    expect(exemptionProofMissing([{ vatCode: "S21" }], [])).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { kindOfPaper, onSide, parseSide } from "./sides";

describe("the sides of a shipment both ways", () => {
  it("shows a side its own rules and the rules for any direction", () => {
    expect(onSide("export", "export")).toBe(true);
    expect(onSide("*", "import")).toBe(true);
    expect(onSide("export", "import")).toBe(false);
  });

  it("reads a paper's direction from its rule, per box too, the destination's with the export", () => {
    const kinds = { EXA: "export", DO: "import" } as const;
    expect(kindOfPaper({ code: "DO", source: "step" }, kinds)).toBe("import");
    expect(kindOfPaper({ code: "EXA#box-1", source: "step" }, kinds)).toBe("export");
    expect(kindOfPaper({ code: "COO", source: "destination" }, kinds)).toBe("export");
    expect(kindOfPaper({ code: "UNKNOWN", source: "step" }, kinds)).toBe("*");
  });

  it("opens on the export side unless the import is asked for", () => {
    expect(parseSide("import")).toBe("import");
    expect(parseSide(undefined)).toBe("export");
  });
});

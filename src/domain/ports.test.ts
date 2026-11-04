import { describe, expect, it } from "vitest";
import { parseAliases, portCode, portHint, portWords } from "./ports";

describe("ports", () => {
  it("reads a typed code, upper-cased, and refuses what is not a UN/LOCODE", () => {
    expect(portCode(" beanr ")).toBe("BEANR");
    expect(portCode("CNSHA")).toBe("CNSHA");
    expect(portCode("Antwerp")).toBeNull();
    expect(portCode("BE1NR")).toBeNull();
    expect(portCode(null)).toBeNull();
  });
  it("keeps each other name once, in the order typed", () => {
    expect(parseAliases("Apapa; apapa\nLagos ;  ; Tin Can")).toEqual(["Apapa", "Lagos", "Tin Can"]);
  });
  it("says the name, the country and a pre-clearance beside the code", () => {
    expect(portHint({ code: "CMDLA", name: "Douala", country: "CM" })).toBe("Douala (CM)");
    expect(portHint({ code: "TRMER", name: "Mersin", country: "TR", preClearance: true })).toBe(
      "Mersin (TR) · pre-clearance",
    );
  });
});

describe("portWords", () => {
  it("spells a port as its city, country and code for the ocean-leg picker", () => {
    expect(portWords({ code: "CMDLA", name: "Douala", country: "CM" })).toBe("Douala (CM) (CMDLA)");
  });
  it("keeps the code alone for a port the table knows by its code only", () => {
    expect(portWords({ code: "XAABC", name: "XAABC", country: "XA" })).toBe("XAABC");
    expect(portWords({ code: "XAABC", name: "", country: "XA" })).toBe("XAABC");
  });
});

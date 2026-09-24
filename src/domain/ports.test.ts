import { describe, expect, it } from "vitest";
import { DEFAULT_PORTS, parsePortLines, portLines } from "./ports";

describe("ports", () => {
  it("ships the legacy table, each code once", () => {
    expect(DEFAULT_PORTS.length).toBeGreaterThan(250);
    expect(new Set(DEFAULT_PORTS.map((p) => p.code)).size).toBe(DEFAULT_PORTS.length);
    expect(DEFAULT_PORTS.find((p) => p.code === "CMDLA")).toEqual({
      code: "CMDLA",
      name: "Douala",
      country: "CM",
    });
  });
  it("reads one port per line and names a bad line", () => {
    const r = parsePortLines(
      "beanr Antwerp be\n\nNGLOS Lagos (Apapa) NG\nnonsense\nBEANR Twice BE",
    );
    expect(r.ports).toEqual([
      { code: "BEANR", name: "Antwerp", country: "BE" },
      { code: "NGLOS", name: "Lagos (Apapa)", country: "NG" },
    ]);
    expect(r.problems).toEqual(['Line 4: expected "CODE Name CC", e.g. BEANR Antwerp BE']);
  });
  it("writes the lines the editor reads back", () => {
    const two = DEFAULT_PORTS.slice(0, 2);
    expect(parsePortLines(portLines(two)).ports).toEqual(two);
  });
});

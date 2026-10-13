import { describe, expect, it } from "vitest";
import { arrivalOf, legProblem, routingLabel } from "./legs";

describe("a booking on several vessels", () => {
  it("arrives when the last leg does, not at the transhipment port", () => {
    expect(arrivalOf("2026-09-20", [])).toBe("2026-09-20");
    expect(arrivalOf("2026-09-20", [{ eta: "2026-10-02" }])).toBe("2026-10-02");
    expect(arrivalOf("2026-09-20", [{ eta: "2026-09-28" }, { eta: null }])).toBe("2026-09-28");
    expect(arrivalOf(null, [{ eta: null }])).toBeNull();
  });

  it("writes the routing in one line, nothing when direct", () => {
    const main = { name: "MSC ROMA", voyage: "FA534A" };
    expect(routingLabel(main, [])).toBe("");
    expect(
      routingLabel(main, [{ position: 1, name: "MAERSK SELETAR", voyage: "112W", eta: null }]),
    ).toBe("MSC ROMA FA534A → MAERSK SELETAR 112W");
  });

  it("refuses a leg without a main sailing, the main sailing itself, or a sailing already on", () => {
    expect(legProblem("v2", null, [])).toMatch(/main sailing first/);
    expect(legProblem("v1", "v1", [])).toMatch(/main sailing/);
    expect(legProblem("v2", "v1", [{ vesselId: "v2" }])).toMatch(/already/);
    expect(legProblem("v2", "v1", [])).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { CONTAINER_SPECS, vgm } from "./container";
import {
  parseCommaList,
  DEFAULT_PROFESSIONS,
  DEFAULT_WITHDRAW_REASONS,
  ownerOf,
  specsByType,
} from "./lookups";

describe("the lookups", () => {
  it("ship the legacy lists", () => {
    expect(DEFAULT_WITHDRAW_REASONS).toHaveLength(5);
    expect(DEFAULT_PROFESSIONS.slice(0, 5)).toEqual([
      "Freight forwarder",
      "Transporter",
      "Carrier",
      "Forwarder",
      "Customs",
    ]);
    expect(DEFAULT_PROFESSIONS.length).toBeGreaterThan(80);
  });

  it("read the professions typed on a form, each once", () => {
    expect(parseCommaList(" Transporter, Used clothing; Transporter\nSugar ")).toEqual([
      "Transporter",
      "Used clothing",
      "Sugar",
    ]);
    expect(parseCommaList(null)).toEqual([]);
  });

  it("name a box's owner by its prefix, any case", () => {
    const owners = [
      { prefix: "MSCU", owner: "MSC" },
      { prefix: "TCLU", owner: "Triton (leased)" },
    ];
    expect(ownerOf(owners, "mscu1234566")).toBe("MSC");
    expect(ownerOf(owners, "XXXU0000000")).toBeNull();
    expect(ownerOf(owners, null)).toBeNull();
  });

  it("feed the container types' tare and maximum gross to the VGM", () => {
    const specs = Object.entries(CONTAINER_SPECS).map(([type, s]) => ({ type, ...s }));
    expect(specsByType(specs)["40HC"]).toEqual({ tareKg: 3900, maxGrossKg: 32500 });
    const custom = specsByType([{ type: "40hc", tareKg: 4000, maxGrossKg: 30000 }]);
    expect(vgm({ type: "40HC", cargoKg: 27_000, tareKg: null }, custom)).toMatchObject({
      state: "over",
      grossKg: 31_000,
      maxGrossKg: 30_000,
    });
  });
});

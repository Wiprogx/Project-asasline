import { describe, expect, it } from "vitest";
import { CONTAINER_SPECS, vgm } from "./container";
import {
  parseCommaList,
  boxOwnerLines,
  containerSpecLines,
  DEFAULT_BOX_OWNERS,
  DEFAULT_PROFESSIONS,
  DEFAULT_WITHDRAW_REASONS,
  ownerOf,
  parseBoxOwnerLines,
  parseContainerSpecLines,
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

  it("name a box's owner by its prefix and round-trip the owners table", () => {
    expect(ownerOf(DEFAULT_BOX_OWNERS, "mscu1234566")).toBe("MSC");
    expect(ownerOf(DEFAULT_BOX_OWNERS, "XXXU0000000")).toBeNull();
    expect(ownerOf(DEFAULT_BOX_OWNERS, null)).toBeNull();
    const { owners, problems } = parseBoxOwnerLines(boxOwnerLines(DEFAULT_BOX_OWNERS));
    expect(problems).toEqual([]);
    expect(owners).toEqual(DEFAULT_BOX_OWNERS);
    expect(parseBoxOwnerLines("MS | MSC").problems[0]).toMatch(/four letters/);
  });

  it("round-trip the container specs and feed them to the VGM", () => {
    const specs = Object.entries(CONTAINER_SPECS).map(([type, s]) => ({ type, ...s }));
    const { specs: back, problems } = parseContainerSpecLines(containerSpecLines(specs));
    expect(problems).toEqual([]);
    expect(back).toEqual(specs);
    expect(parseContainerSpecLines("40HC | 3900 | 3000").problems[0]).toMatch(/above the tare/);
    const custom = specsByType([{ type: "40HC", tareKg: 4000, maxGrossKg: 30000 }]);
    expect(vgm({ type: "40HC", cargoKg: 27_000, tareKg: null }, custom)).toMatchObject({
      state: "over",
      grossKg: 31_000,
      maxGrossKg: 30_000,
    });
  });
});

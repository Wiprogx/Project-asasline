import { describe, expect, it } from "vitest";
import {
  BOOKING_FLOW,
  BOOKING_STATUS_META,
  BOOKING_STATUSES,
  DEFAULT_CANCEL_REASONS,
} from "./shipments";

describe("shipment vocabulary", () => {
  it("has a label and a tone for every status", () => {
    for (const s of BOOKING_STATUSES) expect(BOOKING_STATUS_META[s].label).toBeTruthy();
  });
  it("keeps cancelled out of the forward flow, and every flow step a real status", () => {
    expect(BOOKING_FLOW).not.toContain("cancelled");
    expect(BOOKING_STATUSES.filter((s) => s !== "cancelled")).toEqual([...BOOKING_FLOW]);
  });
  it("offers 'Other' as the last cancel reason", () => {
    expect(DEFAULT_CANCEL_REASONS.at(-1)).toBe("Other");
  });
});

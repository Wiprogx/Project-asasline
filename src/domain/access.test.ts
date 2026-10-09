import { describe, expect, it } from "vitest";
import { DEFAULT_ACCESS_WATCH, logWindow, personSummary, watching } from "./access";

describe("access", () => {
  it("records what the table says, and fails closed for a key it does not know", () => {
    expect(watching(DEFAULT_ACCESS_WATCH, "cost")).toBe(true);
    expect(watching(DEFAULT_ACCESS_WATCH, "price")).toBe(false);
    expect(watching([], "download")).toBe(false);
  });
  it("reads a window ending today", () => {
    expect(logWindow("day", "2026-10-09")).toEqual({ from: "2026-10-09", to: "2026-10-09" });
    expect(logWindow("week", "2026-10-09")).toEqual({ from: "2026-10-03", to: "2026-10-09" });
    expect(logWindow("month", "2026-10-09").from).toBe("2026-09-10");
    expect(logWindow("all", "2026-10-09").from).toBeNull();
  });
  it("sums up what a person did: records touched once each, messages, files, sensitive reads", () => {
    expect(
      personSummary([
        { action: "booking.edit", entity: "booking", entityId: "b1" },
        { action: "container.edit", entity: "booking", entityId: "b1" },
        { action: "quotation.send", entity: "quotation", entityId: "q1" },
        { action: "message.out", entity: "message", entityId: "m1" },
        { action: "booking.file.add", entity: "booking", entityId: "b2" },
        { action: "booking.cost.view", entity: "booking", entityId: "b1" },
        { action: "file.download", entity: "booking", entityId: "b1" },
      ]),
    ).toEqual({
      entries: 7,
      bookings: 2,
      quotations: 1,
      messages: 1,
      files: 1,
      tasksClosed: 0,
      looked: 2,
    });
  });
});

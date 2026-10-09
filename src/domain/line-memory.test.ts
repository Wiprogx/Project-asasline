import { describe, expect, it } from "vitest";
import { memoryKey, rememberedAccount } from "./line-memory";

describe("line memory", () => {
  it("keys a line by its words, without the month, the number or the date", () => {
    expect(memoryKey("Office cleaning, September")).toBe("office cleaning");
    expect(memoryKey("Office cleaning, October 2026")).toBe("office cleaning");
    expect(memoryKey("Warehouse rent 10/2026 — contract 4471")).toBe("warehouse rent contract");
  });
  it("fills in what the office booked last time, and nothing for a line it never saw", () => {
    const mem = [{ key: "office cleaning", account: "610000" }];
    expect(rememberedAccount(mem, "Office cleaning, November")).toBe("610000");
    expect(rememberedAccount(mem, "Forklift repair")).toBeNull();
    expect(rememberedAccount(mem, "2026-10")).toBeNull();
  });
});

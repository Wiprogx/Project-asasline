import { describe, expect, it } from "vitest";
import { escalationMoot, escalationTitle } from "./escalation";

describe("escalationMoot", () => {
  it("closes without a task when the shipment is home or cancelled", () => {
    expect(escalationMoot("arrived")).toBe(true);
    expect(escalationMoot("cancelled")).toBe(true);
  });

  it("escalates a message on a live shipment, or on none", () => {
    expect(escalationMoot("confirmed")).toBe(false);
    expect(escalationMoot(null)).toBe(false);
  });
});

describe("escalationTitle", () => {
  it("names what came in, the subject first", () => {
    expect(escalationTitle("Loading date?", "body")).toBe("Nobody picked this up — Loading date?");
    expect(escalationTitle(null, "Can you call me\nback")).toBe(
      "Nobody picked this up — Can you call me back",
    );
    expect(escalationTitle(null, null)).toBe("Nobody picked this up — a message");
  });

  it("cuts a long one to fit a task title", () => {
    const t = escalationTitle("x".repeat(80), null);
    expect(t).toBe(`Nobody picked this up — ${"x".repeat(59)}…`);
  });
});

import { describe, expect, it } from "vitest";
import { ALERT_META, headline, openAlerts } from "./alerts";

const a = (level: "urgent" | "alert" | "info", text: string, day: number, resolved = false) => ({
  level,
  text,
  createdAt: `2026-10-${String(day).padStart(2, "0")}T10:00:00Z`,
  resolvedAt: resolved ? "2026-10-20T10:00:00Z" : null,
});

describe("a booking's alerts", () => {
  it("label each level as the legacy did", () => {
    expect(ALERT_META.urgent.label).toBe("Urgent");
    expect(ALERT_META.alert.tone).toBe("warning");
  });

  it("list the open ones, the most serious first, then the newest", () => {
    const list = [
      a("info", "FYI", 3),
      a("alert", "Late SI", 1),
      a("urgent", "Held", 2),
      a("alert", "Newer", 4),
      a("urgent", "Old", 1, true),
    ];
    expect(openAlerts(list).map((x) => x.text)).toEqual(["Held", "Newer", "Late SI", "FYI"]);
  });

  it("headline the file with its most serious open alert, or nothing", () => {
    expect(headline([a("info", "FYI", 3), a("alert", "Late SI", 1)])?.text).toBe("Late SI");
    expect(headline([a("urgent", "Done", 1, true)])).toBeNull();
  });
});

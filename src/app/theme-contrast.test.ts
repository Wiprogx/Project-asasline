import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WCAG 2.2 AA contrast, computed from the theme's own tokens in both themes: text at 4.5:1 on
 * every surface it is written on (1.4.3), a form control's edge and the focus ring at 3:1 (1.4.11).
 * A token changed in globals.css that breaks a pair fails here, before any browser runs.
 */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]),
  );
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// `control` is checked solid: it is laid at 30–80% over a card, never stronger than this.
const SURFACES = ["background", "card", "popover", "muted", "secondary", "accent", "control"];
const TEXT = [
  "foreground",
  "muted-foreground",
  "primary",
  "destructive",
  "success",
  "warning",
  "info",
];
const EDGES = ["input", "ring"];

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("the %s theme", (_name, selector) => {
  const t = tokens(selector);

  it("defines every token the checks read", () => {
    for (const k of [...SURFACES, ...TEXT, ...EDGES]) expect(t[k], k).toMatch(/^#/);
  });

  it.each(TEXT.flatMap((fg) => SURFACES.map((bg) => [fg, bg])))(
    "writes %s on %s at 4.5:1 or more",
    (fg, bg) => {
      expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(EDGES.flatMap((edge) => SURFACES.map((bg) => [edge, bg])))(
    "draws %s against %s at 3:1 or more",
    (edge, bg) => {
      expect(ratio(t[edge], t[bg])).toBeGreaterThanOrEqual(3);
    },
  );

  it("keeps the label on a primary button readable", () => {
    expect(ratio(t["primary-foreground"], t.primary)).toBeGreaterThanOrEqual(4.5);
  });
});

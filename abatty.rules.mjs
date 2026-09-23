/**
 * ASASLINE's own rules, beside abatty's catalog. The probes (abatty.probes.mjs) hold the
 * invariants as numbers; these rules hold the shape of the repository that makes the
 * migration from the legacy single-file app reviewable.
 */

const dirs = (c, re) => [...new Set(c.allFiles.map((f) => re.exec(f)?.[1]).filter(Boolean))];

export const rules = [
  {
    id: "TMS-INVARIANTS",
    family: "Domain",
    title: "The business invariants are written down, and the probes cite them",
    level: "must",
    enforcement: "hard",
    phase: "0",
    why: "The legacy app's rules (no delete, gap-free numbers, roles not names, fail closed) are what the office relies on; a rule that lives only in someone's head is lost in the rewrite.",
    next: "Keep docs/INVARIANTS.md; every INV.n it lists is held by a probe or named as review-only",
    check: (c) => {
      const has = c.exists("docs/INVARIANTS.md");
      const cited = has && c.read("abatty.probes.mjs").includes("INV.");
      return {
        status: has && cited ? "present" : has ? "partial" : "missing",
        evidence: has ? "docs/INVARIANTS.md" : "none",
      };
    },
  },
  {
    id: "TMS-MIGRATION-MAP",
    family: "Domain",
    title: "Every legacy app has a line in the migration map",
    level: "must",
    enforcement: "review",
    phase: "0",
    why: "The legacy file is 16,686 lines; without a map from its sections to the new modules, a screen is forgotten until the office needs it on the day of the cut-over.",
    next: "List each legacy app (Home, Activity, Quotations, Bookings, Contacts, Discuss, Accounting, Settings) in docs/MIGRATION.md with its state",
    check: (c) => {
      const text = c.read("docs/MIGRATION.md");
      const apps = [
        "Activity",
        "Quotations",
        "Bookings",
        "Contacts",
        "Discuss",
        "Accounting",
        "Settings",
      ];
      const missing = apps.filter((a) => !text.includes(a));
      return {
        status: !text ? "missing" : missing.length ? "partial" : "present",
        evidence: !text
          ? "none"
          : missing.length
            ? `missing: ${missing.join(", ")}`
            : "docs/MIGRATION.md",
      };
    },
  },
  {
    id: "TMS-FEATURE-SHAPE",
    family: "Structure",
    title: "A feature with server actions validates its input in schemas.ts",
    level: "must",
    enforcement: "hard",
    phase: "1",
    why: "Server actions are public HTTP endpoints; FormData is untrusted. The zod schema beside them is the only place input is shaped, so a reviewer checks one file.",
    next: "Add src/features/<name>/schemas.ts and parse every action's input with it",
    check: (c) => {
      const withActions = dirs(c, /^src\/features\/([^/]+)\/actions\.ts$/);
      const bare = withActions.filter((d) => !c.exists(`src/features/${d}/schemas.ts`));
      return {
        status: withActions.length === 0 ? "n/a" : bare.length ? "missing" : "present",
        evidence: bare.length
          ? `no schemas.ts: ${bare.join(", ")}`
          : `${withActions.length} features`,
      };
    },
  },
  {
    id: "TMS-DOMAIN-TESTED",
    family: "Domain",
    title: "Every domain module is exercised by a unit test",
    level: "must",
    enforcement: "hard",
    phase: "1",
    why: "src/domain is the legacy engine's logic, ported; the legacy rule was 'no claim of done without a test'. A module no test imports is a port nobody checked.",
    next: "Import the module from a *.test.ts under src/domain",
    check: (c) => {
      const mods = c.allFiles.filter(
        (f) => /^src\/domain\/[^/]+\.ts$/.test(f) && !f.endsWith(".test.ts"),
      );
      const tests = c.allFiles
        .filter((f) => /^src\/domain\/.+\.test\.ts$/.test(f))
        .map((f) => c.read(f))
        .join("\n");
      const untested = mods
        .map((f) => f.slice("src/domain/".length, -3))
        .filter((m) => !tests.includes(`"./${m}"`));
      return {
        status: mods.length === 0 ? "n/a" : untested.length ? "missing" : "present",
        evidence: untested.length ? `untested: ${untested.join(", ")}` : `${mods.length} modules`,
      };
    },
  },
];

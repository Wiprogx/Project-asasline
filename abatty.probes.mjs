/**
 * ASASLINE's own ratchet probes: the invariants of the legacy TMS (docs/INVARIANTS.md), turned
 * from prose into numbers the gate refuses to see rise. Every probe is HARD: zero now, zero
 * forever. Each ships a case it must report and a case it must not (`abatty ratchet --controls`).
 *
 * A probe reads files only; nothing here executes repository code.
 */

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

/** Every regex match in the files as a finding on its line. */
function scanFiles(c, files, re, detail) {
  const findings = [];
  for (const f of files) {
    const text = c.read(f);
    for (const m of text.matchAll(re))
      findings.push({ path: f, line: lineAt(text, m.index ?? 0), detail: detail(m) });
  }
  return { scanned: files.length, findings };
}

const isTest = (f) => /\.test\.[cm]?[jt]sx?$/.test(f);

export const probes = [
  {
    metric: "tms.hardDelete",
    kind: "hard",
    standard: ["INV.1"],
    title: "Rows deleted from the database",
    why: "Nothing numbered or referenced is ever deleted: it is cancelled, archived or withdrawn with a reason and can be put back. A delete loses the number, the history and every link to it.",
    emptyScanOk: false,
    scan: (c) =>
      scanFiles(
        c,
        c.sourceFiles.filter((f) => f.startsWith("src/") && !isTest(f)),
        /\b(?:db|tx)\s*\.\s*delete\s*\(|\bdelete\s+from\b/gi,
        (m) => `hard delete: ${m[0].trim()}`,
      ),
    controls: [
      {
        name: "db.delete and a raw DELETE FROM count two",
        files: {
          "src/a.ts": "await db.delete(users);\nawait db.execute(sql`DELETE FROM contacts`);\n",
        },
        expect: 2,
      },
      {
        name: "a cookie or a map entry is not a row",
        files: { "src/a.ts": "jar.delete('asl_session');\nseen.delete(key);\n" },
        expect: 0,
      },
    ],
  },
  {
    metric: "tms.floatMoney",
    kind: "hard",
    standard: ["INV.7"],
    title: "Floating-point columns in the database schema",
    why: "Money is integer cents end to end. A float column turns 0.10 + 0.20 into 0.30000000000000004 on an invoice that must be gap-free and immutable once issued.",
    scan: (c) =>
      scanFiles(
        c,
        c.sourceFiles.filter((f) => /^src\/server\/db\/schema\//.test(f)),
        /\b(?:real|doublePrecision)\s*\(/g,
        (m) => `float column: ${m[0]}`,
      ),
    controls: [
      {
        name: "a real() price column is reported",
        files: {
          "src/server/db/schema/x.ts": "export const t = pgTable('t', { price: real() });\n",
        },
        expect: 1,
      },
      {
        name: "integer cents hold",
        files: {
          "src/server/db/schema/x.ts":
            "export const t = pgTable('t', { priceCents: integer() });\n",
        },
        expect: 0,
      },
    ],
  },
  {
    metric: "tms.domainClock",
    kind: "hard",
    standard: ["INV.10", "VALID.5"],
    title: "Clock or time-zone reads inside src/domain",
    why: "The legacy engine gave different working days in Brussels and Auckland because it parsed dates through the platform clock. Domain rules take 'today' as an argument; only src/server/clock.ts reads the wall clock.",
    scan: (c) =>
      scanFiles(
        c,
        c.sourceFiles.filter((f) => f.startsWith("src/domain/") && !isTest(f)),
        /\bnew\s+Date\s*\(|\bDate\.now\s*\(|\bIntl\.DateTimeFormat\b|\.getTimezoneOffset\s*\(/g,
        (m) => `clock read: ${m[0]}`,
      ),
    controls: [
      {
        name: "new Date() and Date.now() in a rule count two",
        files: {
          "src/domain/a.ts":
            "export const t = () => new Date();\nexport const n = () => Date.now();\n",
        },
        expect: 2,
      },
      {
        name: "Date.UTC arithmetic and a test file hold",
        files: {
          "src/domain/a.ts": "export const d = Date.UTC(2026, 0, 1);\n",
          "src/domain/a.test.ts": "const now = new Date();\n",
        },
        expect: 0,
      },
    ],
  },
  {
    metric: "tms.refRewrite",
    kind: "hard",
    standard: ["INV.9"],
    title: "Updates that rewrite an issued ref (QT/SB/invoice number)",
    why: "A ref is issued once by the database sequence and never edited: documents, messages and the customer's own records quote it.",
    scan: (c) =>
      scanFiles(
        c,
        c.sourceFiles.filter((f) => f.startsWith("src/") && !isTest(f)),
        /\.set\(\s*\{[^}]*?\bref\s*:/g,
        () => "update sets ref",
      ),
    controls: [
      {
        name: "an update that sets ref is reported",
        files: { "src/a.ts": "await tx.update(bookings).set({ status, ref: next });\n" },
        expect: 1,
      },
      {
        name: "an insert that sets ref holds",
        files: {
          "src/a.ts":
            "await tx.insert(bookings).values({ ref, status });\nawait tx.update(bookings).set({ status });\n",
        },
        expect: 0,
      },
    ],
  },
  {
    metric: "tms.unguardedServerFn",
    kind: "hard",
    standard: ["INV.3", "SEC.1"],
    title: "Feature queries and actions that skip the permission check",
    why: "The proxy's cookie check is only a redirect. Every exported query and server action must call requirePermission / requireUser before it touches data, or a role sees what the matrix forbids.",
    scan: (c) => {
      const files = c.sourceFiles.filter((f) =>
        /^src\/features\/(?!auth\/)[^/]+\/(?:[\w-]+-)?(?:queries|actions)\.ts$/.test(f),
      );
      const findings = [];
      // An exported async function, or an exported const holding one (possibly in React cache()).
      const EXPORTED =
        /^export\s+(?:async\s+function\s+(\w+)|const\s+(\w+)\s*=\s*(?:cache\()?async\b)/gm;
      for (const f of files) {
        const text = c.read(f);
        const starts = [...text.matchAll(EXPORTED)];
        starts.forEach((m, i) => {
          const body = text.slice(m.index, starts[i + 1]?.index ?? text.length);
          if (
            !/\b(?:requirePermission|requireUser|requirePagePermission|getCurrentUser)\s*\(/.test(
              body,
            )
          )
            findings.push({
              path: f,
              line: lineAt(text, m.index ?? 0),
              detail: `${m[1] ?? m[2]} has no permission check`,
            });
        });
      }
      return { scanned: files.length, findings };
    },
    controls: [
      {
        name: "an action without a check is reported",
        files: {
          "src/features/x/actions.ts": "export async function a() {\n  return db.select();\n}\n",
        },
        expect: 1,
      },
      {
        name: "a cached const query and a *-actions.ts file are scanned too",
        files: {
          "src/features/x/queries.ts":
            "export const q = cache(async (id: string) => {\n  return db.select();\n});\n",
          "src/features/x/container-actions.ts": "export async function a() {\n  return 1;\n}\n",
        },
        expect: 2,
      },
      {
        name: "a guarded query holds",
        files: {
          "src/features/x/queries.ts":
            "export async function q() {\n  await requirePermission('app.contacts');\n  return db.select();\n}\n",
        },
        expect: 0,
      },
    ],
  },
];

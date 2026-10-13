// Extracts an inventory of the legacy app (legacy/asasline-demo.html) — every field, select and
// its options, table column, action, tab, validation, confirmation, business-rule function and
// constant list — one markdown file per module under docs/legacy-inventory/. Read-only on the
// legacy file; run with `node scripts/legacy-inventory.mjs`. The output is a checklist to port
// against, not a judgement of the new app.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SRC = "legacy/asasline-demo.html";
const OUT = "docs/legacy-inventory";
const lines = readFileSync(SRC, "utf8").split(/\r?\n/);

// Modules by the legacy file's own section banners (line numbers are 1-based, inclusive).
const MODULES = [
  [
    "platform",
    "Platform — data model, references, dates, people, navigation",
    [
      [1, 757],
      [2126, 2282],
      [2501, 2679],
      [16370, 99999],
    ],
  ],
  ["catalogue", "Catalogue, price lists and reference lists", [[758, 1515]]],
  ["vessels", "Vessels, sailings and cut-offs", [[1516, 1979]]],
  ["home", "Home", [[2283, 2500]]],
  [
    "bookings",
    "Bookings — list, field registry, detail, copies, documents, files",
    [
      [2680, 4477],
      [7680, 8316],
      [8527, 8572],
    ],
  ],
  ["contacts", "Contacts", [[4478, 5827]]],
  ["quotations", "Quotations — analytics, list, editor", [[5828, 7679]]],
  [
    "activity",
    "Activity — covers, document rules, automatic activities, calendar",
    [
      [1980, 2004],
      [9049, 10235],
      [12308, 12624],
    ],
  ],
  [
    "discuss",
    "Discuss — routing, messages, templates, chat, calls, queue",
    [
      [2005, 2125],
      [8573, 9048],
      [11550, 12307],
    ],
  ],
  // L14918–L15041 sits after the Settings banner but is accounting: reports, aged balances,
  // the accounting settings (categories, payment terms, general items, numbering).
  [
    "accounting",
    "Accounting",
    [
      [12625, 14783],
      [14918, 15041],
    ],
  ],
  [
    "settings",
    "Settings — rules editor, configuration tabs, people, links, demo, integrations, audit",
    [
      [8317, 8526],
      [10236, 11549],
      [14784, 14917],
      [15042, 15419],
    ],
  ],
];
const DEMO = [15420, 16369];
const moduleOf = (n) => {
  if (n >= DEMO[0] && n <= DEMO[1]) return null;
  for (const [key, , ranges] of MODULES) if (ranges.some(([a, b]) => n >= a && n <= b)) return key;
  return "platform";
};

const clean = (s) =>
  String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\$\{[^}]*\}/g, "…")
    .replace(/&nbsp;|&amp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const cell = (s) => clean(s).replace(/\|/g, "\\|").slice(0, 220);

const inv = Object.fromEntries(
  MODULES.map(([k]) => [
    k,
    {
      lists: [],
      fields: [],
      selects: [],
      columns: [],
      actions: [],
      tabs: [],
      sets: [],
      shown: [],
      checks: [],
      confirms: [],
      rules: [],
    },
  ]),
);
const seen = new Set();
const once = (key) => (seen.has(key) ? false : (seen.add(key), true));

/** The text of a balanced literal starting at (line i, col c): [ … ] or { … }, across lines. */
function literalAt(i, c) {
  const open = lines[i][c];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let out = "";
  let inStr = null;
  for (let l = i; l < Math.min(lines.length, i + 400); l++) {
    const text = l === i ? lines[l].slice(c) : lines[l];
    for (let k = 0; k < text.length; k++) {
      const ch = text[k];
      out += ch;
      if (inStr) {
        if (ch === "\\") {
          out += text[++k] ?? "";
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch;
        continue;
      }
      if (ch === open || ch === "[" || ch === "{") depth++;
      else if (ch === close || ch === "]" || ch === "}") {
        depth--;
        if (depth === 0) return { text: out, end: l };
      }
    }
    out += "\n";
  }
  return { text: out, end: i };
}

/** The comment just above line i (a /* … *\/ block or // lines), first 300 characters. */
function commentAbove(i) {
  let j = i - 1;
  while (j >= 0 && lines[j].trim() === "") j--;
  if (j < 0) return "";
  if (lines[j].trim().endsWith("*/")) {
    let k = j;
    while (k >= 0 && !lines[k].includes("/*")) k--;
    return clean(
      lines
        .slice(Math.max(k, 0), j + 1)
        .join(" ")
        .replace(/\/\*+|\*+\//g, ""),
    ).slice(0, 300);
  }
  if (lines[j].trim().startsWith("//"))
    return clean(lines[j].replace(/^\s*\/\/\s?/, "")).slice(0, 300);
  return "";
}

for (let i = 0; i < lines.length; i++) {
  const n = i + 1;
  const mod = moduleOf(n);
  if (!mod) continue;
  const L = lines[i];
  const box = inv[mod];

  // Constant lists and maps: UPPER_CASE = [ … ] or { … }.
  const list = L.match(/^\s*(?:const|let|var)\s+([A-Z][A-Z0-9_]{1,})\s*=\s*([[{])/);
  if (list) {
    const c = L.indexOf(list[2], L.indexOf(list[1]));
    const lit = literalAt(i, c);
    const body = lit.text.replace(/\s+/g, " ").trim();
    box.lists.push({
      n,
      name: list[1],
      body:
        body.length > 1800
          ? `${body.slice(0, 1800)} … (${body.length} chars, see L${n}–L${lit.end + 1})`
          : body,
      comment: commentAbove(i),
    });
  }

  // Tabs: tabs:[["k","Label"],…], X_TABS=[[…]] or const tabs=[[…]] (across lines).
  const tabAt = L.search(/(?:\btabs\s*[:=]|_TABS\s*=)\s*\[\[/);
  if (tabAt >= 0) {
    const lit = literalAt(i, L.indexOf("[[", tabAt));
    const pairs = [
      ...lit.text.matchAll(/\[\s*["'`]([\w-]+)["'`]\s*,\s*(["'`])([\s\S]*?)\2\s*\]/g),
    ].map((p) => `${clean(p[3])} [${p[1]}]`);
    if (once(`tab|${n}`))
      box.tabs.push({ n, text: pairs.join(" · ") || lit.text.replace(/\s+/g, " ").slice(0, 400) });
  }

  // Inline option sets: [["key","Label"],…] written in a template (chips, selects, toggles).
  if (tabAt < 0)
    for (const m of L.matchAll(/\$\{\s*\[\s*\[\s*"[\w-]+"\s*,/g)) {
      const lit = literalAt(i, L.indexOf("[", m.index + 2));
      const pairs = [...lit.text.matchAll(/\[\s*"([\w-]+)"\s*,\s*"([^"]*)"/g)].map(
        (p) => `${p[2]} [${p[1]}]`,
      );
      if (pairs.length && once(`set|${n}|${m.index}`))
        box.sets.push({ n, text: pairs.join(" · ") });
    }

  // Fields: <label>Text</label> with the input id that follows, and the booking field registry.
  for (const m of L.matchAll(/<label(?:\s[^>]*)?>([^<]{1,120})<\/label>/g)) {
    const near = lines.slice(i, i + 3).join(" ");
    const idm = near.slice(near.indexOf(m[0]) + m[0].length).match(/\bid="([\w-]+)"/);
    const kind =
      (near.match(/<(input|select|textarea)\b[^>]*?(?:type="(\w+)")?/) || [])[2] ||
      (near.match(/<(select|textarea)\b/) || [])[1] ||
      "input";
    box.fields.push({ n, label: m[1], id: idm ? idm[1] : "", kind });
  }
  for (const m of L.matchAll(/\bbf(Cut|In)\(\s*"(\w+)"(?:\s*,\s*"([^"]+)")?/g))
    if (!/^function\s/.test(L.trim()))
      box.fields.push({
        n,
        label: m[3] || `cut-off ${m[2]} (label from CUTOFF_RULES)`,
        id: `registry:${m[2]}`,
        kind: `field registry (bf${m[1]})`,
      });
  for (const m of L.matchAll(/\{\s*k\s*:\s*"(\w+)"\s*,\s*lbl\s*:\s*"([^"]+)"/g))
    box.fields.push({ n, label: m[2], id: `registry:${m[1]}`, kind: "field registry" });
  for (const m of L.matchAll(/class="fld"[^>]*>\s*<label[^>]*>([^<]+)</g))
    if (!box.fields.some((f) => f.n === n && f.label === m[1]))
      box.fields.push({ n, label: m[1], id: "", kind: "input" });

  // Read-only values shown on a record or a card: kv("Label", …), a labelled span, a section heading.
  for (const m of L.matchAll(/\bkv\(\s*"([^"]{1,80})"/g))
    box.shown.push({ n, label: m[1], kind: "value" });
  for (const m of L.matchAll(/<span class="(?:faint|muted)">([^<$]{2,80})<\/span>/g))
    box.shown.push({ n, label: m[1], kind: "labelled value" });
  for (const m of L.matchAll(/<div class="sect">([^<$]{2,100})/g))
    box.shown.push({ n, label: m[1], kind: "section" });

  // Selects: the id and every option, literal or generated.
  if (/<select\b/.test(L)) {
    const chunk = [];
    for (let k = i; k < Math.min(lines.length, i + 25); k++) {
      chunk.push(lines[k]);
      if (lines[k].includes("</select>")) break;
    }
    const text = chunk.join(" ");
    for (const part of text.split(/(?=<select\b)/).filter((p) => p.startsWith("<select"))) {
      const id = (part.match(/\bid="([\w-]+)"/) || [])[1] || "";
      const body = part.split("</select>")[0];
      const literal = [
        ...body.matchAll(/<option\b[^>]*?(?:value="([^"]*)")?[^>]*>([^<]*)<\/option>/g),
      ]
        .map((o) => (o[1] !== undefined && o[1] !== o[2] ? `${o[2]} [${o[1]}]` : o[2]).trim())
        .filter(Boolean);
      const gen = [
        ...body.matchAll(
          /\$\{\s*([A-Za-z_][\w.]*(?:\([^)]*\))?(?:\.[\w]+(?:\([^)]*\))?)*?)\.(?:map|filter)\(/g,
        ),
      ].map((g) => g[1]);
      const inline = [
        ...body.matchAll(/\$\{\s*(\[[^\]]+\](?:\s*,\s*\[[^\]]+\])*\]?)\s*\.map/g),
      ].map((g) => g[1]);
      const label =
        (lines
          .slice(Math.max(0, i - 2), i + 1)
          .join(" ")
          .match(/<label[^>]*>([^<]+)<\/label>(?![\s\S]*<label)/) || [])[1] || "";
      const key = `sel|${n}|${id}`;
      if (once(key))
        box.selects.push({ n, id, label, options: literal, generated: [...gen, ...inline] });
    }
  }

  // Table columns: a header row of <th>.
  const ths = [...L.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)]
    .map((m) => clean(m[1]))
    .filter(Boolean);
  if (ths.length) box.columns.push({ n, cols: ths });
  const thMap = L.match(/\.map\(\s*\w+\s*=>\s*`<th[^`]*`\)/);
  if (thMap) box.columns.push({ n, cols: [`(generated) ${clean(L.slice(0, 200))}`] });

  // Actions: anything clickable, with its handler and its visible text.
  for (const m of L.matchAll(
    /onclick="([^"]{1,300})"([^>]*)>([\s\S]{0,160}?)<\/(button|span|div|a|label)>/g,
  )) {
    const handler = m[1].replace(/\s+/g, " ").trim();
    const fn = (handler.match(/([A-Za-z_$][\w$.]*)\s*\(/) || [])[1] || handler.slice(0, 40);
    const text = clean(m[3]) || clean((m[2].match(/title="([^"]+)"/) || [])[1] || "") || "(icon)";
    if (once(`act|${mod}|${fn}|${text}`))
      box.actions.push({ n, text, fn, handler: handler.slice(0, 160) });
  }
  for (const m of L.matchAll(/openSheet\(\s*"([^"]{1,120})"/g))
    if (once(`sheet|${mod}|${m[1]}`))
      box.actions.push({ n, text: `sheet: ${m[1]}`, fn: "openSheet", handler: "" });

  // Validations and refusals the user sees, and the confirmations asked.
  for (const m of L.matchAll(/toast\(\s*(["'`])((?:⚠|⛔)[^"'`]{0,240})\1/g))
    box.checks.push({ n, text: m[2], fn: "" });
  for (const m of L.matchAll(/toast\(\s*(["'`])((?:⚠|⛔)[^"'`]{0,120})\1\s*\+/g))
    box.checks.push({ n, text: `${m[2]} …`, fn: "" });
  for (const m of L.matchAll(/(askConfirm(?:Action)?)\(\s*(["'`])([^"'`]{1,200})/g))
    box.confirms.push({ n, text: m[3] });

  // Business-rule functions, with the comment that explains them.
  const fn =
    L.match(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/) ||
    L.match(/^\s*(?:const|let)\s+([a-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?([^)=]*)\)?\s*=>/);
  if (fn)
    box.rules.push({ n, name: fn[1], args: fn[2].trim().slice(0, 60), comment: commentAbove(i) });
}

// Attach each validation to the function it sits in.
for (const box of Object.values(inv))
  for (const c of box.checks) {
    const owner = [...box.rules].reverse().find((r) => r.n <= c.n);
    c.fn = owner ? owner.name : "";
  }

const isScreen = (r) =>
  /^(v[A-Z]|open[A-Z]|render[A-Z]|show[A-Z]|edit[A-Z]|add[A-Z]|new[A-Z])/.test(r.name);
const frontMatter = (title, description) => [
  "---",
  `title: ${JSON.stringify(title)}`,
  `description: ${JSON.stringify(description)}`,
  "category: reference",
  "status: generated",
  'audience: ["developer", "agent"]',
  'tags: ["tms", "legacy", "parity"]',
  "---",
  "",
];
mkdirSync(OUT, { recursive: true });
const index = [];
for (const [key, title] of MODULES) {
  const b = inv[key];
  const md = [];
  md.push(
    ...frontMatter(
      `Legacy inventory — ${title}`,
      `Every field, select, column, action, rule and list of the legacy ${title} module, by legacy line.`,
    ),
  );
  md.push(`# Legacy inventory — ${title}`, "");
  md.push(
    `Extracted by \`scripts/legacy-inventory.mjs\` from \`${SRC}\`. Every row cites its legacy line (Lnnnn). This is the checklist to port against: each row is to be marked ported, adapted (say how), or dropped (say why) during the parity review.`,
    "",
  );
  md.push("| Category | Count |", "| --- | --- |");
  const counts = [
    ["Lists and maps", b.lists],
    ["Tabs", b.tabs],
    ["Inline option sets (chips, toggles)", b.sets],
    ["Screens and sheets", b.rules.filter(isScreen)],
    ["Fields", b.fields],
    ["Values shown (read-only)", b.shown],
    ["Selects", b.selects],
    ["Table header rows", b.columns],
    ["Actions", b.actions],
    ["Validations and refusals", b.checks],
    ["Confirmations", b.confirms],
    ["Functions (business rules)", b.rules],
  ];
  for (const [l, a] of counts) md.push(`| ${l} | ${a.length} |`);
  md.push("");
  md.push(
    "## Lists and maps",
    "",
    "| L | Name | Why (comment above) | Content |",
    "| --- | --- | --- | --- |",
  );
  for (const x of b.lists)
    md.push(
      `| ${x.n} | \`${x.name}\` | ${cell(x.comment)} | \`${x.body.replace(/\|/g, "\\|").replace(/`/g, "'")}\` |`,
    );
  md.push("", "## Tabs", "", "| L | Tabs |", "| --- | --- |");
  for (const x of b.tabs) md.push(`| ${x.n} | \`${x.text.replace(/\|/g, "\\|")}\` |`);
  md.push(
    "",
    "## Inline option sets (chips, toggles, generated selects)",
    "",
    "| L | Options |",
    "| --- | --- |",
  );
  for (const x of b.sets) md.push(`| ${x.n} | ${cell(x.text)} |`);
  md.push(
    "",
    "## Screens and sheets",
    "",
    "| L | Function | What it shows (comment above) |",
    "| --- | --- | --- |",
  );
  for (const x of b.rules.filter(isScreen))
    md.push(`| ${x.n} | \`${x.name}\` | ${cell(x.comment)} |`);
  md.push("", "## Fields", "", "| L | Label | Input id | Kind |", "| --- | --- | --- | --- |");
  for (const x of b.fields)
    md.push(`| ${x.n} | ${cell(x.label)} | ${x.id ? `\`${x.id}\`` : ""} | ${x.kind} |`);
  md.push("", "## Values shown (read-only)", "", "| L | Label | Kind |", "| --- | --- | --- |");
  for (const x of b.shown) md.push(`| ${x.n} | ${cell(x.label)} | ${x.kind} |`);
  md.push(
    "",
    "## Selects and their options",
    "",
    "| L | Label | Select id | Options (literal) | Options (generated from) |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const x of b.selects)
    md.push(
      `| ${x.n} | ${cell(x.label)} | ${x.id ? `\`${x.id}\`` : ""} | ${cell(x.options.join(" · "))} | ${x.generated.map((g) => `\`${g.replace(/\|/g, "\\|")}\``).join(", ")} |`,
    );
  md.push("", "## Tables and columns", "", "| L | Columns |", "| --- | --- |");
  for (const x of b.columns) md.push(`| ${x.n} | ${x.cols.map(cell).join(" · ")} |`);
  md.push(
    "",
    "## Actions",
    "",
    "| L | Visible text | Handler | Call |",
    "| --- | --- | --- | --- |",
  );
  for (const x of b.actions)
    md.push(
      `| ${x.n} | ${cell(x.text)} | \`${x.fn}\` | \`${x.handler.replace(/\|/g, "\\|").replace(/`/g, "'")}\` |`,
    );
  md.push("", "## Validations and refusals", "", "| L | In | Message |", "| --- | --- | --- |");
  for (const x of b.checks) md.push(`| ${x.n} | \`${x.fn}\` | ${cell(x.text)} |`);
  md.push("", "## Confirmations", "", "| L | Question |", "| --- | --- |");
  for (const x of b.confirms) md.push(`| ${x.n} | ${cell(x.text)} |`);
  md.push(
    "",
    "## Functions (business rules)",
    "",
    "| L | Function | Arguments | What it does (comment above) |",
    "| --- | --- | --- | --- |",
  );
  for (const x of b.rules)
    md.push(`| ${x.n} | \`${x.name}\` | ${cell(x.args)} | ${cell(x.comment)} |`);
  writeFileSync(`${OUT}/${key}.md`, `${md.join("\n")}\n`);
  index.push([key, title, ...counts.map(([, a]) => a.length)]);
}

const head = [
  "Module",
  "Lists",
  "Tabs",
  "Option sets",
  "Screens",
  "Fields",
  "Shown",
  "Selects",
  "Tables",
  "Actions",
  "Checks",
  "Confirms",
  "Functions",
];
const readme = [
  ...frontMatter(
    "Legacy inventory",
    "What the legacy app shows and decides, module by module, extracted so nothing is forgotten in the migration.",
  ),
  "# Legacy inventory",
  "",
  `Everything the legacy app (\`${SRC}\`, ${lines.length} lines) shows or decides, extracted mechanically by \`scripts/legacy-inventory.mjs\` so nothing is forgotten in the migration. One file per module, split by the legacy file's own section banners; the demo-data section (L${DEMO[0]}–L${DEMO[1]}) is left out. Re-run the script after a change to the legacy reference; the parity review marks each row ported, adapted or dropped.`,
  "",
  `| ${head.join(" | ")} |`,
  `| ${head.map(() => "---").join(" | ")} |`,
  ...index.map(([k, t, ...c]) => `| [${t}](${k}.md) | ${c.join(" | ")} |`),
  "",
];
writeFileSync(`${OUT}/README.md`, readme.join("\n"));
// The gate checks formatting: the generated files are written the way Prettier would write them.
spawnSync("npx", ["prettier", "--write", "--log-level", "warn", `${OUT}/*.md`], {
  stdio: "inherit",
  shell: true,
});
console.log(index.map(([k, , ...c]) => `${k.padEnd(11)} ${c.join("\t")}`).join("\n"));

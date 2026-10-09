/**
 * The goods in a container (legacy HS lines, PACKAGE_TYPES, boxWeight / boxPkgs / boxPkgType).
 * An HS line is a commodity with its own weight and its own packages; the box totals are the
 * sum of them, so nobody adds up by hand — and the B/L, the VGM and the customs declaration
 * read the same numbers. The line values win when they are filled in; otherwise the box keeps
 * what was typed for it as a whole ("cargo as declared by the shipper").
 */
export type HsLine = {
  /** Six digits of the Harmonised System; the description comes from the hsCodes table. */
  code: string;
  weightKg: number | null;
  packages: number | null;
  packageType: string | null;
};

export type HsCode = { code: string; description: string };

/** Seed for the `hsCodes` Settings table (legacy HS_CODES); the running app reads the table. */
export const DEFAULT_HS_CODES: HsCode[] = (
  [
    ["630900", "Worn clothing and other worn articles"],
    ["630510", "Sacks & bags — jute or bast fibres"],
    ["610910", "T-shirts, singlets — cotton, knitted"],
    ["610990", "T-shirts, singlets — other textiles"],
    ["620342", "Men's trousers & shorts — cotton"],
    ["620462", "Women's trousers & shorts — cotton"],
    ["620343", "Men's trousers — synthetic fibres"],
    ["611020", "Pullovers, cardigans — cotton, knitted"],
    ["620520", "Men's shirts — cotton"],
    ["620630", "Women's blouses & shirts — cotton"],
    ["640399", "Footwear with leather uppers"],
    ["640411", "Sports footwear — textile uppers"],
    ["420222", "Handbags — plastic or textile"],
    ["560319", "Nonwovens — man-made filaments"],
    ["580620", "Narrow woven fabrics — elastomeric"],
    ["940161", "Upholstered seats with wooden frames"],
    ["940360", "Wooden furniture — other"],
    ["940350", "Wooden bedroom furniture"],
    ["940430", "Sleeping bags"],
    ["940490", "Bedding, quilts, cushions"],
    ["732690", "Articles of iron or steel — other"],
    ["761510", "Aluminium table & kitchen articles"],
    ["691200", "Ceramic tableware & kitchenware"],
    ["701337", "Drinking glasses — other"],
    ["392490", "Plastic household articles"],
    ["482010", "Registers, notebooks, order books"],
    ["854451", "Electric conductors — 80V to 1000V"],
    ["850760", "Lithium-ion accumulators"],
    ["851762", "Machines for reception/transmission of data"],
    ["870323", "Motor cars — spark-ignition 1500–3000cc"],
    ["870880", "Suspension systems & parts"],
    ["871200", "Bicycles, non-motorised"],
    ["100590", "Maize (corn) — other"],
    ["110220", "Maize (corn) flour"],
    ["170199", "Cane or beet sugar — refined"],
    ["190531", "Sweet biscuits"],
    ["200990", "Mixtures of juices"],
    ["210390", "Sauces & preparations — other"],
    ["220210", "Waters with added sugar or flavouring"],
    ["330499", "Beauty or make-up preparations"],
    ["340111", "Soap for toilet use"],
    ["382200", "Diagnostic or laboratory reagents"],
    ["441820", "Doors and frames — wood"],
    ["681099", "Articles of cement or concrete"],
    ["690790", "Ceramic flags & paving tiles"],
  ] as const
).map(([code, description]) => ({ code, description }));

/** Seed for the `packageTypes` list (legacy PACKAGE_TYPES). */
export const DEFAULT_PACKAGE_TYPES = [
  "Bags",
  "Bales",
  "Barrels",
  "Big bags (FIBC)",
  "Boxes",
  "Bundles",
  "Cartons",
  "Cases",
  "Coils",
  "Crates",
  "Drums",
  "Jerricans",
  "Pallets",
  "Packages",
  "Pieces",
  "Reels",
  "Rolls",
  "Sacks",
  "Skids",
  "Loose / unpacked",
];

export const hsDescription = (table: readonly HsCode[], code: string) =>
  table.find((h) => h.code === code)?.description ?? null;

/* ---- the Settings table, one code per line ----------------------------------------------- */

export const hsCodeLines = (codes: readonly HsCode[]) =>
  codes.map((h) => `${h.code} | ${h.description}`).join("\n");

export function parseHsCodeLines(text: string): { codes: HsCode[]; problems: string[] } {
  const codes: HsCode[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [code = "", description = ""] = line.split("|").map((x) => x.trim());
      if (!/^\d{6}$/.test(code)) problems.push(`Line ${i + 1}: a six-digit HS code.`);
      else if (!description || description.length > 120)
        problems.push(`Line ${i + 1}: a description (up to 120 characters).`);
      else if (codes.some((h) => h.code === code)) problems.push(`Line ${i + 1}: ${code} twice.`);
      else codes.push({ code, description });
    });
  return { codes, problems };
}

/* ---- the HS lines of a box, one per line ------------------------------------------------- */

const num = (s: string) => (s === "" ? null : Number(s));

/** `code | weight kg | packages | package type` per line; everything after the code is optional. */
export function parseHsLines(text: string): { lines: HsLine[]; problem: string | null } {
  const lines: HsLine[] = [];
  for (const [i, raw] of text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .entries()) {
    const [code = "", weight = "", packages = "", packageType = ""] = raw
      .split("|")
      .map((x) => x.trim());
    const w = num(weight);
    const n = num(packages);
    if (!/^\d{6}$/.test(code)) return { lines, problem: `Line ${i + 1}: a six-digit HS code.` };
    if (w !== null && (!Number.isInteger(w) || w < 0 || w > 100_000))
      return { lines, problem: `Line ${i + 1}: the weight in whole kilograms.` };
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 1_000_000))
      return { lines, problem: `Line ${i + 1}: the packages as a whole number.` };
    if (packageType.length > 60)
      return { lines, problem: `Line ${i + 1}: a package type up to 60 characters.` };
    lines.push({ code, weightKg: w, packages: n, packageType: packageType || null });
  }
  return { lines, problem: null };
}

export const hsLineText = (lines: readonly HsLine[]) =>
  lines
    .map((l) =>
      [l.code, l.weightKg ?? "", l.packages ?? "", l.packageType ?? ""]
        .join(" | ")
        .replace(/(\s\|\s*)+$/, ""),
    )
    .join("\n");

/* ---- the box totals: the lines win when filled in ---------------------------------------- */

export type BoxGoods = {
  hsLines: readonly HsLine[];
  cargoKg: number | null;
  packages: number | null;
  packageType: string | null;
};

const sum = (xs: readonly (number | null)[]) => {
  const filled = xs.filter((x): x is number => x !== null);
  return filled.length ? filled.reduce((s, x) => s + x, 0) : null;
};

/** The cargo weight the VGM and the papers use: the lines' total when any line carries one. */
export const cargoKgOf = (c: BoxGoods) => sum(c.hsLines.map((l) => l.weightKg)) ?? c.cargoKg;

export const packagesOf = (c: BoxGoods) => sum(c.hsLines.map((l) => l.packages)) ?? c.packages;

/** One type when the lines agree, "A + B" when they differ, else what the box says. */
export function packageTypeOf(c: BoxGoods): string | null {
  const types = [...new Set(c.hsLines.map((l) => l.packageType).filter((t): t is string => !!t))];
  if (types.length === 1) return types[0];
  if (types.length > 1) return types.join(" + ");
  return c.packageType;
}

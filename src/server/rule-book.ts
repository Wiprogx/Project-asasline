import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseYmd } from "@/domain/dates";
import { ROLES } from "@/domain/permissions";
import type { Holiday } from "@/domain/rules/calendar";
import { DEFAULT_HOLIDAYS, DEFAULT_RULES } from "@/domain/rules/defaults";
import { ANCHORS, type DocRule, PARTIES } from "@/domain/rules/engine";
import { cached, invalidateTags } from "./cache/cache";
import { db, type Tx } from "./db/client";
import { configTables } from "./db/schema";
import { writeTable } from "./config-tables";

/**
 * The document rule book and the public holidays: Settings tables like the lists, with a
 * schema each. The engine in src/domain/rules is pure; this is where its data is stored,
 * validated and cached.
 */
export const docRuleSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,29}$/, "Code in capitals, e.g. BIETC_FILE"),
  doc: z.string().min(2).max(120),
  step: z.string().min(2).max(200),
  country: z.string().regex(/^(\*|[A-Z]{2})$/, "ISO-2 country or *"),
  pol: z.string().regex(/^(\*|[A-Z]{2}[A-Z2-9]{3})$/, "UN/LOCODE or *"),
  kind: z.enum(["export", "import", "*"]),
  party: z.enum(PARTIES),
  role: z.enum(ROLES),
  anchor: z.enum(ANCHORS),
  offset: z.number().int().min(-60).max(60),
  workingDays: z.boolean(),
  blocking: z.boolean(),
  needs: z.array(z.string()).max(20),
  active: z.boolean(),
  note: z.string().max(500).optional(),
  sold: z.string().max(100).optional(),
  perBox: z.boolean().optional(),
  ready: z.literal("weights").optional(),
}) satisfies z.ZodType<DocRule>;

export const holidaySchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/, "ISO-2 country"),
  date: z.string().refine((d) => parseYmd(d) !== null, "Date as YYYY-MM-DD"),
  name: z.string().min(2).max(80),
}) satisfies z.ZodType<Holiday>;

const TABLES = {
  docRules: { schema: z.array(docRuleSchema).max(500), fallback: DEFAULT_RULES },
  holidays: { schema: z.array(holidaySchema).max(1000), fallback: DEFAULT_HOLIDAYS },
} as const;
type Name = keyof typeof TABLES;
const tag = (name: Name) => `config:${name}`;

async function readRow<T>(name: Name, schema: z.ZodType<T>, fallback: T) {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, name)).limit(1);
  if (!row) return { value: fallback, version: 0 };
  const parsed = schema.safeParse(row.value);
  if (parsed.success) return { value: parsed.data, version: row.version };
  console.error(`[rules] ${name} has an invalid shape; using the defaults`, parsed.error.issues);
  return { value: fallback, version: row.version };
}

/**
 * A rule the defaults gained after an office saved its book (CERTIWEIGHT, 2026-09-24) is
 * appended to it, switched as the default says: rules are never deleted, only switched off,
 * so a code missing from a saved book was never there. A changed default (VGM waiting on the
 * weights) is not applied over a saved rule: that is the office's row to edit.
 */
const readRules = async () => {
  const row = await readRow("docRules", TABLES.docRules.schema, TABLES.docRules.fallback);
  const known = new Set(row.value.map((r) => r.code));
  const missing = DEFAULT_RULES.filter((r) => !known.has(r.code));
  return missing.length ? { ...row, value: [...row.value, ...missing] } : row;
};
const readDays = () => readRow("holidays", TABLES.holidays.schema, TABLES.holidays.fallback);

export const readRuleBook = (): Promise<DocRule[]> =>
  cached(
    "config:docRules",
    { ttlSeconds: 600, tags: [tag("docRules")] },
    async () => (await readRules()).value,
  );

export const readHolidays = (): Promise<Holiday[]> =>
  cached(
    "config:holidays",
    { ttlSeconds: 600, tags: [tag("holidays")] },
    async () => (await readDays()).value,
  );

/** For the Settings editors: the live rows and the version to send back. */
export const readRuleBookForEdit = readRules;
export const readHolidaysForEdit = readDays;

export async function writeRuleBook(tx: Tx, rules: DocRule[], version: number, userId: string) {
  await writeTable(tx, "docRules", TABLES.docRules.schema.parse(rules), version, userId);
}

export async function writeHolidays(tx: Tx, holidays: Holiday[], version: number, userId: string) {
  await writeTable(tx, "holidays", TABLES.holidays.schema.parse(holidays), version, userId);
}

export const invalidateRuleBook = () => invalidateTags(tag("docRules"), tag("holidays"));

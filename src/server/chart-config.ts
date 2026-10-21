import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type Chart, withBuiltIn } from "@/domain/chart";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "chartOfAccounts";
export const CHART_TAG = `config:${NAME}`;

export const chartSchema = z.record(
  z.string().regex(/^[1-7]\d{5}$/),
  z.string().trim().min(1).max(80),
);

async function saved(): Promise<{ chart: Chart | null; version: number }> {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? chartSchema.safeParse(row.value) : null;
  return { chart: parsed?.success ? parsed.data : null, version: row?.version ?? 0 };
}

/** The office's chart of accounts: the built-in accounts, renamed or not, and its own. */
export const readChart = () =>
  cached(NAME, { ttlSeconds: 600, tags: [CHART_TAG] }, async () =>
    withBuiltIn((await saved()).chart),
  );

export async function readChartForEdit() {
  const s = await saved();
  return { chart: withBuiltIn(s.chart), version: s.version };
}

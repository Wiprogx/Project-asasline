import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type ActivityRule, DEFAULT_ACTIVITY_RULES, TRIGGERS } from "@/domain/activity-rules";
import { ROLES } from "@/domain/permissions";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "activityRules";
export const ACTIVITY_RULES_TAG = `config:${NAME}`;

export const activityRulesSchema = z
  .array(
    z.object({
      trigger: z.enum(TRIGGERS),
      label: z.string().trim().min(1).max(60),
      title: z.string().trim().min(1).max(200),
      type: z.string().trim().min(1).max(40),
      role: z.enum(ROLES),
      days: z.number().int().min(0).max(365),
      active: z.boolean(),
    }),
  )
  .max(40);

const fallback = () => DEFAULT_ACTIVITY_RULES.map((r) => ({ ...r }));

export async function readActivityRulesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? activityRulesSchema.safeParse(row.value) : null;
  return { rules: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}

/** The automatic activities (legacy ACTIVITY_RULES): a Settings table, the legacy six until saved. */
export function readActivityRules(): Promise<ActivityRule[]> {
  return cached(NAME, { ttlSeconds: 600, tags: [ACTIVITY_RULES_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? activityRulesSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });
}

import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type Checklist, DEFAULT_CHECKLISTS } from "@/domain/checklists";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "checklists";
export const CHECKLISTS_TAG = `config:${NAME}`;

export const checklistsSchema = z
  .array(
    z.object({
      key: z.string().regex(/^[a-z][a-z0-9_]{1,29}$/),
      label: z.string().min(1).max(80),
      items: z
        .array(
          z.object({
            k: z.string().regex(/^[a-z][a-z0-9_]{0,29}$/),
            t: z.string().min(1).max(120),
            hint: z.string().max(300).optional(),
          }),
        )
        .min(1)
        .max(40),
    }),
  )
  .max(50);

const fallback = (): Checklist[] => DEFAULT_CHECKLISTS.map((l) => ({ ...l, items: [...l.items] }));

/** What a paper must carry (legacy CHECKLISTS): the Settings table, the legacy invoice check until saved. */
export const readChecklists = () =>
  cached(NAME, { ttlSeconds: 600, tags: [CHECKLISTS_TAG] }, async (): Promise<Checklist[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? checklistsSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });

export async function readChecklistsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? checklistsSchema.safeParse(row.value) : null;
  return { lists: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}

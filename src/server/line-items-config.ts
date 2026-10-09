import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_LINE_ITEMS, LINE_ITEM_KINDS, type LineItem } from "@/domain/line-items";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "lineItems";
export const LINE_ITEMS_TAG = `config:${NAME}`;

export const lineItemsSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z][a-z0-9_]{0,30}$/),
      kind: z.enum(LINE_ITEM_KINDS),
      name: z.string().min(1).max(120),
      account: z.string().regex(/^\d{6}$/),
      vat: z.string().min(1).max(10),
    }),
  )
  .max(200);

const fallback = (): LineItem[] => DEFAULT_LINE_ITEMS.map((i) => ({ ...i }));

/** The general line items (legacy GL_ITEMS + SALE_ITEMS), a Settings table; the legacy ten until saved. */
export const readLineItems = () =>
  cached(NAME, { ttlSeconds: 600, tags: [LINE_ITEMS_TAG] }, async (): Promise<LineItem[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? lineItemsSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });

export async function readLineItemsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? lineItemsSchema.safeParse(row.value) : null;
  return { items: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}

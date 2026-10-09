import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { invalidateTags } from "@/server/cache/cache";
import { writeTable } from "@/server/config-tables";
import { db } from "@/server/db/client";
import { ConflictError } from "@/server/versioned";

export const versioned = z.object({ version: z.coerce.number().int().min(0) });

/** One Settings table written with its version, audited, its cache cleared; a stale save is a conflict. */
export async function saveTable(p: {
  userId: string;
  name: string;
  value: unknown;
  version: number;
  tag: string;
  path: string;
  detail: Record<string, unknown>;
}): Promise<ActionResult | null> {
  try {
    await db.transaction(async (tx) => {
      await writeTable(tx, p.name, p.value, p.version, p.userId);
      await audit(tx, {
        action: "config.save",
        userId: p.userId,
        entity: "config",
        entityId: p.name,
        detail: p.detail,
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(`${e.message} Reload the page to see the latest.`);
    throw e;
  }
  await invalidateTags(p.tag);
  revalidatePath(p.path);
  revalidatePath("/", "layout");
  return null;
}

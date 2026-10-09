"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags } from "@/server/cache/cache";
import { categoriesSchema, RATE_CATEGORIES_TAG } from "@/server/catalogue-config";
import { writeTable } from "@/server/config-tables";
import { db } from "@/server/db/client";
import { rateItems } from "@/server/db/schema";
import { ConflictError } from "@/server/versioned";

const form = z.object({
  version: z.coerce.number().int().min(0),
  lines: z.string().max(20_000),
});

/**
 * The catalogue's categories and the accounts their sales and purchases go to (legacy
 * "Categories & accounts"), one per line: `code | Label | sales | purchase`. A category in use
 * cannot be dropped: items keep pointing at it, so the code must stay in the table.
 */
export async function saveRateCategories(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = form.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const rows = parsed.data.lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("|").map((x) => x.trim()))
    .map(([code = "", label = "", salesAccount = "", purchaseAccount = ""]) => ({
      code: code.toLowerCase(),
      label,
      salesAccount,
      purchaseAccount,
    }));
  const checked = categoriesSchema.safeParse(rows);
  if (!checked.success)
    return fail(
      'Each line reads "code | Label | sales account | purchase account" (six-digit accounts, e.g. ocean | Ocean freight | 700000 | 604000).',
    );
  const codes = new Set(checked.data.map((c) => c.code));
  const inUse = await db.selectDistinct({ category: rateItems.category }).from(rateItems);
  const orphaned = inUse.map((i) => i.category).filter((c) => !codes.has(c));
  if (orphaned.length)
    return fail(
      `Items still use ${orphaned.join(", ")}: keep those categories, or move the items first.`,
    );
  try {
    await db.transaction(async (tx) => {
      await writeTable(tx, "rateCategories", checked.data, parsed.data.version, user.id);
      await audit(tx, {
        action: "config.save",
        userId: user.id,
        entity: "config",
        entityId: "rateCategories",
        detail: { count: checked.data.length },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(`${e.message} Reload the page to see the latest.`);
    throw e;
  }
  await invalidateTags(RATE_CATEGORIES_TAG);
  revalidatePath("/settings/catalogue", "layout");
  return { ok: true, data: undefined, message: `Saved · ${checked.data.length} categories` };
}

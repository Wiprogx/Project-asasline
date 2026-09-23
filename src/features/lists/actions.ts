"use server";

import { revalidatePath } from "next/cache";
import { normaliseList } from "@/domain/lists";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import {
  CONFIG_NAMES,
  type ConfigName,
  configProblem,
  invalidateConfig,
  writeConfig,
} from "@/server/config-tables";
import { db } from "@/server/db/client";
import { ConflictError } from "@/server/versioned";
import { saveListSchema } from "./schemas";

const isName = (n: string): n is ConfigName => (CONFIG_NAMES as string[]).includes(n);

/**
 * Saves one list. Removing an entry only stops it being offered: records that already use it
 * keep their text, so nothing referenced is lost (invariant 1).
 */
export async function saveList(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = saveListSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { name, version } = parsed.data;
  if (!isName(name)) return fail("Unknown list.");
  const values = normaliseList(parsed.data.values);
  const problem = configProblem(name, values);
  if (problem) return fail(problem);

  try {
    await db.transaction(async (tx) => {
      await writeConfig(tx, name, values, version, user.id);
      await audit(tx, {
        action: "config.save",
        userId: user.id,
        entity: "config",
        entityId: name,
        detail: { count: values.length },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError)
      return fail(`${e.message} Reload the page to see the latest list.`);
    throw e;
  }
  await invalidateConfig(name);
  revalidatePath("/settings/lists");
  return { ok: true, data: undefined, message: `Saved · ${values.length} entries` };
}

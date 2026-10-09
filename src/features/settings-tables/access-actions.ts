"use server";

import { z } from "zod";
import { ACCESS_KEYS, DEFAULT_ACCESS_WATCH } from "@/domain/access";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { ACCESS_WATCH_TAG, accessWatchSchema } from "@/server/access-config";
import { requirePermission } from "@/server/auth/dal";
import { saveTable, versioned } from "./table-store";

const schema = versioned.extend(
  Object.fromEntries(ACCESS_KEYS.map((k) => [k, z.string().optional()])) as Record<
    (typeof ACCESS_KEYS)[number],
    z.ZodOptional<z.ZodString>
  >,
);

/** Which acts of looking are recorded: a checkbox per kind (legacy ACCESS_WATCH toggles). */
export async function saveAccessWatch(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("audit.view");
  const parsed = schema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const watch = DEFAULT_ACCESS_WATCH.map((w) => ({ ...w, on: parsed.data[w.key] === "on" }));
  const checked = accessWatchSchema.safeParse(watch);
  if (!checked.success) return fail("The table does not read right.");
  const bad = await saveTable({
    userId: user.id,
    name: "accessWatch",
    value: checked.data,
    version: parsed.data.version,
    tag: ACCESS_WATCH_TAG,
    path: "/settings/audit",
    detail: { on: checked.data.filter((w) => w.on).map((w) => w.key) },
  });
  return bad ?? { ok: true, data: undefined, message: "Saved — what is recorded" };
}

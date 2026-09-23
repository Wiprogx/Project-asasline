"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TEMPLATE_CHANNELS } from "@/domain/templates";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags } from "@/server/cache/cache";
import { writeTable } from "@/server/config-tables";
import { db } from "@/server/db/client";
import { readTemplates } from "@/server/messaging";
import { ConflictError } from "@/server/versioned";

const templateSchema = z.object({
  version: z.coerce.number().int().min(0),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,29}$/, "Capitals, 2 to 30"),
  name: z.string().trim().min(2, "A name the office recognises").max(80),
  channel: z.enum(TEMPLATE_CHANNELS),
  subject: z.string().trim().max(200).default(""),
  body: z.string().trim().min(1, "The text").max(5000),
  active: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  fresh: z
    .string()
    .optional()
    .transform((v) => v === "1"),
});

/** Saves one template (or adds it); the list is one Settings row, so a stale save is a conflict. */
export async function saveTemplate(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = templateSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { version, fresh, ...t } = parsed.data;
  const current = await readTemplates();
  if (fresh && current.some((x) => x.code === t.code))
    return fail(`${t.code} already exists — change that one instead.`);
  const next = fresh
    ? [...current, { ...t, active: true }]
    : current.map((x) => (x.code === t.code ? t : x));
  try {
    await db.transaction(async (tx) => {
      await writeTable(tx, "templates", next, version, user.id);
      await audit(tx, {
        action: "config.template",
        userId: user.id,
        entity: "config",
        entityId: t.code,
        detail: { fresh },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await invalidateTags("config:templates");
  revalidatePath("/settings/templates");
  return { ok: true, data: undefined, message: `${t.name} saved` };
}

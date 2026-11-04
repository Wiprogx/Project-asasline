"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, invalid } from "@/lib/action-result";
import { CONTACT_COLUMNS, CONTACT_VIEW_PREF, DEFAULT_CONTACT_COLUMNS } from "@/domain/contact-list";
import { mergeTablePrefs, parseTablePrefs } from "@/domain/table-prefs";
import { requirePermission } from "@/server/auth/dal";
import { readPref, writePref } from "@/server/prefs";
import { contactViewSchema } from "./view-schema";
import { SIZABLE_CONTACT_COLUMNS } from "./view-queries";

/**
 * Saves how the signed-in person reads the contacts list: the columns ticked, the widths
 * dragged, or both. A part the patch leaves out stays as it was.
 */
export async function saveContactView(patch: unknown): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = contactViewSchema.safeParse(patch);
  if (!parsed.success) return invalid(parsed.error);
  const prev = parseTablePrefs(
    CONTACT_COLUMNS,
    DEFAULT_CONTACT_COLUMNS,
    await readPref(user.id, CONTACT_VIEW_PREF),
    SIZABLE_CONTACT_COLUMNS,
  );
  const next = parseTablePrefs(
    CONTACT_COLUMNS,
    DEFAULT_CONTACT_COLUMNS,
    mergeTablePrefs(prev, parsed.data),
    SIZABLE_CONTACT_COLUMNS,
  );
  await writePref(user.id, CONTACT_VIEW_PREF, next);
  revalidatePath("/contacts");
  return { ok: true, data: undefined };
}

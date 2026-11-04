"use server";

import { revalidatePath } from "next/cache";
import { CONTACT_VIEW } from "@/domain/contact-list";
import { type ActionResult, invalid } from "@/lib/action-result";
import { tableViewSchema } from "@/lib/zod-fields";
import { requirePermission } from "@/server/auth/dal";
import { writeTableView } from "@/server/prefs";

const schema = tableViewSchema(CONTACT_VIEW);

/**
 * Saves how the signed-in person reads the contacts list: the columns ticked, the widths
 * dragged, or both. A part the patch leaves out stays as it was.
 */
export async function saveContactView(patch: unknown): Promise<ActionResult> {
  const user = await requirePermission("app.contacts");
  const parsed = schema.safeParse(patch);
  if (!parsed.success) return invalid(parsed.error);
  await writeTableView(user.id, CONTACT_VIEW, parsed.data);
  revalidatePath("/contacts");
  return { ok: true, data: undefined };
}

"use server";

import { revalidatePath } from "next/cache";
import { QUOTATION_VIEW } from "@/domain/quotation-list";
import { type ActionResult, invalid } from "@/lib/action-result";
import { tableViewSchema } from "@/lib/zod-fields";
import { requirePermission } from "@/server/auth/dal";
import { writeTableView } from "@/server/prefs";

const schema = tableViewSchema(QUOTATION_VIEW);

/** Saves how the signed-in person reads the quotations list: the columns ticked, the widths dragged, or both. */
export async function saveQuotationView(patch: unknown): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = schema.safeParse(patch);
  if (!parsed.success) return invalid(parsed.error);
  await writeTableView(user.id, QUOTATION_VIEW, parsed.data);
  revalidatePath("/quotations");
  return { ok: true, data: undefined };
}

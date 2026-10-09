"use server";

import { z } from "zod";
import { parseChecklistLines } from "@/domain/checklists";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { CHECKLISTS_TAG, checklistsSchema } from "@/server/checklist-config";
import { saveTable, versioned } from "./table-store";

/** The checklists, one item per line as "list | List label | item | Item text | hint". */
export async function saveChecklists(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(50_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { lists, problems } = parseChecklistLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = checklistsSchema.safeParse(lists);
  if (!checked.success) return fail("Fifty lists at most, forty items each.");
  const bad = await saveTable({
    userId: user.id,
    name: "checklists",
    value: checked.data,
    version: parsed.data.version,
    tag: CHECKLISTS_TAG,
    path: "/settings/checklists",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} checklists` };
}

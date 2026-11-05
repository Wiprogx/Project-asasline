"use server";

import { z } from "zod";
import { parseRegionLanguageLines } from "@/domain/region-languages";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { REGION_LANGUAGES_TAG, regionLanguagesSchema } from "@/server/region-languages-config";
import { saveTable, versioned } from "./table-store";

/** The regions written to in another language than their country's (Settings › Regional languages). */
export async function saveRegionLanguages(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { rows, problems } = parseRegionLanguageLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = regionLanguagesSchema.safeParse(rows);
  if (!checked.success) return fail("Up to five hundred rules.");
  const bad = await saveTable({
    userId: user.id,
    name: "regionLanguages",
    value: checked.data,
    version: parsed.data.version,
    tag: REGION_LANGUAGES_TAG,
    path: "/settings/region-languages",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? {
      ok: true,
      data: undefined,
      message: `Saved · ${checked.data.length} regional languages`,
    }
  );
}

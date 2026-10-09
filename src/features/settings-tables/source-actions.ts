"use server";

import { z } from "zod";
import { parseRateSourceLines } from "@/domain/rate-sources";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { RATE_SOURCES_TAG, rateSourcesSchema } from "@/server/rate-sources-config";
import { saveTable, versioned } from "./table-store";

/** Where a catalogue rate comes from (legacy Settings › Rate sources): key and label. */
export async function saveRateSources(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(10_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { sources, problems } = parseRateSourceLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = rateSourcesSchema.safeParse(sources);
  if (!checked.success) return fail("Between one and fifty sources.");
  const bad = await saveTable({
    userId: user.id,
    name: "rateSources",
    value: checked.data,
    version: parsed.data.version,
    tag: RATE_SOURCES_TAG,
    path: "/settings/rate-sources",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} rate sources` }
  );
}

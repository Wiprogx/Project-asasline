"use server";

import { z } from "zod";
import { parseChartLines } from "@/domain/chart";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { CHART_TAG } from "@/server/chart-config";
import { saveTable, versioned } from "./table-store";

/** The chart of accounts (legacy editAccount): accounts added and renamed, the built-in ones kept. */
export async function saveChart(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(40_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { chart, problems } = parseChartLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const count = Object.keys(chart).length;
  const bad = await saveTable({
    userId: user.id,
    name: "chartOfAccounts",
    value: chart,
    version: parsed.data.version,
    tag: CHART_TAG,
    path: "/settings/accounting",
    detail: { count },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${count} accounts` };
}

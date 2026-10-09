"use server";

import { z } from "zod";
import { matrixProblem, type PermissionMatrix, PERMISSIONS, ROLES } from "@/domain/permissions";
import { parseActivityRuleLines } from "@/domain/activity-rules";
import { parseHsCodeLines } from "@/domain/goods";
import { parseLoadingModeLines } from "@/domain/loading";
import { parseReleaseStateLines, parseSendModeLines, parseTrackStepLines } from "@/domain/release";
import { parsePortLines } from "@/domain/ports";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { FILE_HINTS_TAG, fileHintsSchema } from "@/server/file-config";
import { ACTIVITY_RULES_TAG, activityRulesSchema } from "@/server/activity-config";
import { HS_CODES_TAG, hsCodesSchema } from "@/server/goods-config";
import { LOADING_MODES_TAG, loadingModesSchema } from "@/server/loading-config";
import {
  RELEASE_STATES_TAG,
  releaseStatesSchema,
  SEND_MODES_TAG,
  sendModesSchema,
  TRACK_STEPS_TAG,
  trackStepsSchema,
} from "@/server/release-config";
import { PERMISSIONS_TAG } from "@/server/permission-config";
import { PORTS_TAG } from "@/server/port-config";
import { saveTable, versioned } from "./table-store";

/** The ports table, one per line as "CODE Name CC". */
export async function savePorts(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(200_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { ports, problems } = parsePortLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  if (ports.length === 0) return fail("At least one port.");
  const bad = await saveTable({
    userId: user.id,
    name: "ports",
    value: ports,
    version: parsed.data.version,
    tag: PORTS_TAG,
    path: "/settings/ports",
    detail: { count: ports.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${ports.length} ports` };
}

/** Automatic activities, one per line as "trigger | Label | Title | type | role | days | on or off". */
export async function saveActivityRules(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { rules, problems } = parseActivityRuleLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = activityRulesSchema.safeParse(rules);
  if (!checked.success) return fail("Forty rules at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "activityRules",
    value: checked.data,
    version: parsed.data.version,
    tag: ACTIVITY_RULES_TAG,
    path: "/settings/activity-rules",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? {
      ok: true,
      data: undefined,
      message: `Saved · ${checked.data.length} automatic activities`,
    }
  );
}

/** Release states, one per line as "code | Label | hold or free | hint". */
export async function saveReleaseStates(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { states, problems } = parseReleaseStateLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = releaseStatesSchema.safeParse(states);
  if (!checked.success) return fail("At least one state, twenty at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "releaseStates",
    value: checked.data,
    version: parsed.data.version,
    tag: RELEASE_STATES_TAG,
    path: "/settings/release",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} release states` }
  );
}

/** Ways to send the originals, one per line as "name | tracks or no | tracking page". */
export async function saveSendModes(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { modes, problems } = parseSendModeLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = sendModesSchema.safeParse(modes);
  if (!checked.success) return fail("At least one way, thirty at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "sendModes",
    value: checked.data,
    version: parsed.data.version,
    tag: SEND_MODES_TAG,
    path: "/settings/release",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} send modes` };
}

/** The journey's steps, one per line as "name | auto or manual". */
export async function saveTrackSteps(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { steps, problems } = parseTrackStepLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = trackStepsSchema.safeParse(steps);
  if (!checked.success) return fail("At least one step, thirty at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "trackSteps",
    value: checked.data,
    version: parsed.data.version,
    tag: TRACK_STEPS_TAG,
    path: "/settings/release",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} journey steps` }
  );
}

/** The HS codes, one per line as "630900 | description". */
export async function saveHsCodes(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(300_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { codes, problems } = parseHsCodeLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = hsCodesSchema.safeParse(codes);
  if (!checked.success) return fail("At least one code, two thousand at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "hsCodes",
    value: checked.data,
    version: parsed.data.version,
    tag: HS_CODES_TAG,
    path: "/settings/hs-codes",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} HS codes` };
}

/** The loading modes, one per line as "name | hours | direct or drop | surcharge item | qty". */
export async function saveLoadingModes(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(50_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { modes, problems } = parseLoadingModeLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = loadingModesSchema.safeParse(modes);
  if (!checked.success) return fail("At least one mode, sixty at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "loadingModes",
    value: checked.data,
    version: parsed.data.version,
    tag: LOADING_MODES_TAG,
    path: "/settings/loading",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} loading modes` }
  );
}

/** The filing rules, one per line as "words, more words → CODE". */
export async function saveFileHints(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(50_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const hints = parsed.data.lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [words, code] = l.split(/\s*(?:→|->|=>)\s*/);
      return { words: (words ?? "").trim(), code: (code ?? "").trim().toUpperCase() };
    });
  const checked = fileHintsSchema.safeParse(hints);
  if (!checked.success)
    return fail('Each line reads "words, more words → CODE" (a code in capitals, e.g. INVOICE).');
  const bad = await saveTable({
    userId: user.id,
    name: "fileHints",
    value: checked.data,
    version: parsed.data.version,
    tag: FILE_HINTS_TAG,
    path: "/settings/filing",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} rules` };
}

/** The permission matrix: a checkbox per permission and role; the Admin keeps Settings. */
export async function savePermissions(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const matrix = Object.fromEntries(
    Object.keys(PERMISSIONS).map((p) => [
      p,
      ROLES.map((_, i) => (fd.get(`${p}:${i}`) === "on" ? 1 : 0)),
    ]),
  ) as unknown as PermissionMatrix;
  const problem = matrixProblem(matrix);
  if (problem) return fail(problem);
  const bad = await saveTable({
    userId: user.id,
    name: "permissions",
    value: matrix,
    version: parsed.data.version,
    tag: PERMISSIONS_TAG,
    path: "/settings/permissions",
    detail: { granted: Object.values(matrix).flat().filter(Boolean).length },
  });
  return bad ?? { ok: true, data: undefined, message: "Permissions saved" };
}

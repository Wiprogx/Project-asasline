"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { matrixProblem, type PermissionMatrix, PERMISSIONS, ROLES } from "@/domain/permissions";
import { parsePortLines } from "@/domain/ports";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags } from "@/server/cache/cache";
import { writeTable } from "@/server/config-tables";
import { db } from "@/server/db/client";
import { FILE_HINTS_TAG, fileHintsSchema } from "@/server/file-config";
import { PERMISSIONS_TAG } from "@/server/permission-config";
import { PORTS_TAG } from "@/server/port-config";
import { ConflictError } from "@/server/versioned";

const versioned = z.object({ version: z.coerce.number().int().min(0) });

/** One Settings table written with its version, audited, its cache cleared; a stale save is a conflict. */
async function saveTable(p: {
  userId: string;
  name: string;
  value: unknown;
  version: number;
  tag: string;
  path: string;
  detail: Record<string, unknown>;
}): Promise<ActionResult | null> {
  try {
    await db.transaction(async (tx) => {
      await writeTable(tx, p.name, p.value, p.version, p.userId);
      await audit(tx, {
        action: "config.save",
        userId: p.userId,
        entity: "config",
        entityId: p.name,
        detail: p.detail,
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(`${e.message} Reload the page to see the latest.`);
    throw e;
  }
  await invalidateTags(p.tag);
  revalidatePath(p.path);
  revalidatePath("/", "layout");
  return null;
}

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

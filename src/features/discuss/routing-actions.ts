"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROLES } from "@/domain/permissions";
import { type ActionResult, fail } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags } from "@/server/cache/cache";
import { writeTable } from "@/server/config-tables";
import { db } from "@/server/db/client";
import { readRoutes } from "@/server/messaging";
import { ConflictError } from "@/server/versioned";

const rowSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,19}$/, "Code: capitals, 2 to 20"),
  subject: z.string().trim().min(1, "What the topic is").max(100),
  role: z.enum(ROLES),
  active: z.boolean(),
});

/**
 * Saves the routing table (topic → role) and the escalation delay. A topic always names a
 * role, never a person: the person is found when the message arrives (invariant 3).
 */
export async function saveRouting(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const codes = fd.getAll("code").map(String);
  // A topic added on this screen has no switch yet: it is on once saved.
  const known = new Set((await readRoutes()).map((r) => r.code));
  const rows = codes
    .map((code, i) => ({
      code,
      subject: String(fd.getAll("subject")[i] ?? ""),
      role: String(fd.getAll("role")[i] ?? ""),
      active: known.has(code.trim().toUpperCase()) ? fd.get(`active-${code}`) === "on" : true,
    }))
    .filter((r) => r.code.trim() || r.subject.trim());
  const parsed = z.array(rowSchema).min(1, "At least one topic").safeParse(rows);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the table.");
  const seen = new Set<string>();
  for (const r of parsed.data) {
    if (seen.has(r.code)) return fail(`${r.code} is in the table twice.`);
    seen.add(r.code);
  }
  if (!parsed.data.some((r) => r.code === "OTHER" && r.active))
    return fail("Keep OTHER on: a message with no topic must still reach someone.");
  const minutes = z.coerce.number().int().min(5).max(1440).safeParse(fd.get("minutes"));
  if (!minutes.success) return fail("Escalate after 5 to 1440 minutes.");
  try {
    await db.transaction(async (tx) => {
      await writeTable(tx, "routes", parsed.data, Number(fd.get("version") ?? 0), user.id);
      await writeTable(
        tx,
        "escalation",
        { minutes: minutes.data },
        Number(fd.get("escalationVersion") ?? 0),
        user.id,
      );
      await audit(tx, {
        action: "config.routes",
        userId: user.id,
        entity: "config",
        entityId: "routes",
        detail: { topics: parsed.data.length, escalateAfter: minutes.data },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await invalidateTags("config:routes");
  revalidatePath("/settings/routing");
  revalidatePath("/discuss", "layout");
  return { ok: true, data: undefined, message: "Routing saved" };
}

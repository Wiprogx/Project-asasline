"use server";

import { eq } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { activities } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { editTaskSchema } from "./schemas";
import { Refused, run } from "./task-store";

/**
 * A task's words, type, due day and note corrected (legacy editActivity). A step a rule opened
 * follows its rule — its words and day are re-planned from it — so it is not edited by hand.
 */
export async function editTask(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.activity");
  const parsed = editTaskSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, title, typeId, due, note } = parsed.data;
  return run(
    () =>
      db.transaction(async (tx) => {
        const [cur] = await tx.select().from(activities).where(eq(activities.id, id));
        if (!cur) throw new ConflictError("This task");
        if (cur.state !== "open") throw new Refused("Only an open task can be edited.");
        if (cur.ruleCode)
          throw new Refused("This step follows its rule; change the rule in Settings › Rules.");
        await updateVersioned(
          tx,
          activities,
          id,
          version,
          {
            title,
            typeId: typeId ?? null,
            due: due ?? null,
            note: note || null,
            updatedBy: user.id,
          },
          "This task",
        );
        await audit(tx, {
          action: "task.edit",
          userId: user.id,
          entity: "activity",
          entityId: id,
          detail: { title, due: due ?? null },
        });
        return { linkKind: cur.linkKind, linkId: cur.linkId };
      }),
    "Task saved",
  );
}

import "server-only";
import { and, eq } from "drizzle-orm";
import { type RuleVars, taskFor, type Trigger } from "@/domain/activity-rules";
import { readActivityRules } from "./activity-config";
import type { DbOrTx } from "./db/client";
import { activities } from "./db/schema";

/**
 * Opens the task an event calls for (legacy autoActivity): the active rule for the trigger
 * says the words, the type, the role and the due day. The task goes to the person who caused
 * the event, under the rule's role; the same open task on the same record is never doubled.
 * Returns the task's id, or null when no rule wants one.
 */
export async function openAutoTask(
  tx: DbOrTx,
  p: {
    trigger: Trigger;
    vars: RuleVars;
    link: { kind: "quotation" | "booking"; id: string };
    userId: string;
    today: string;
  },
): Promise<string | null> {
  const task = taskFor(await readActivityRules(), p.trigger, p.vars, p.today);
  if (!task) return null;
  const [dup] = await tx
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.linkKind, p.link.kind),
        eq(activities.linkId, p.link.id),
        eq(activities.state, "open"),
        eq(activities.title, task.title),
      ),
    );
  if (dup) return dup.id;
  const [row] = await tx
    .insert(activities)
    .values({
      title: task.title,
      type: task.type,
      assigneeId: p.userId,
      role: task.role,
      due: task.due,
      linkKind: p.link.kind,
      linkId: p.link.id,
      createdBy: p.userId,
      updatedBy: p.userId,
    })
    .returning({ id: activities.id });
  return row.id;
}

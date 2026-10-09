import { z } from "zod";
import { ROLES } from "@/domain/permissions";
import { ownerProblem } from "@/domain/tasks";
import { dayField } from "@/lib/zod-fields";

const day = dayField();

/** Things a task can hang off. Only bookings for now; quotations and contacts follow. */
export const LINK_KINDS = ["booking"] as const;

const owner = {
  assigneeId: z.uuid().optional(),
  role: z.enum(ROLES).optional(),
};

const ownerRequired = (v: { assigneeId?: string; role?: string }, ctx: z.RefinementCtx) => {
  const p = ownerProblem(v.assigneeId, v.role);
  if (p) ctx.addIssue({ code: "custom", path: ["assigneeId"], message: p });
};

export const newTaskSchema = z
  .object({
    title: z.string().min(2, "What needs doing?").max(200),
    due: day.optional(),
    note: z.string().max(2000).optional(),
    linkKind: z.enum(LINK_KINDS).optional(),
    linkId: z.uuid().optional(),
    ...owner,
  })
  .superRefine(ownerRequired);

export const taskRef = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

export const withdrawTaskSchema = taskRef.extend({
  reason: z.string().min(3, "Say why — it stays on the task").max(500),
});

/** Hand over: to a person, or back to a role for whoever picks it up. */
export const handOverSchema = taskRef.extend(owner).superRefine(ownerRequired);

/** The list's filters, from the URL. Anything unexpected falls back to the default view. */
export const listFilterSchema = z.object({
  who: z.union([z.enum(["mine", "all"]), z.uuid()]).catch("mine"),
  state: z.enum(["open", "done", "withdrawn"]).catch("open"),
  q: z.string().max(100).optional().catch(undefined),
});

"use server";

import { and, eq } from "drizzle-orm";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { activities, bookings } from "@/server/db/schema";
import { checkSchema, sendBackSchema } from "./file-schemas";
import { giveWord } from "./review-store";
import { z } from "zod";
import { missingItems } from "@/domain/checklists";
import { codeOfKey } from "@/domain/rules/plan";
import { readChecklists } from "@/server/checklist-config";
import { readRuleBook } from "@/server/rule-book";
import { officeToday } from "@/server/clock";

/** The paper is right (legacy verified): the office's word, and its step is done — with or without a file. */
export async function checkRequirement(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = checkSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, code, reason } = parsed.data;
  const moved = await giveWord(user.id, {
    bookingId,
    code,
    note: reason || null,
    state: "checked",
  });
  if (typeof moved === "string") return fail(moved);
  return {
    ok: true,
    data: undefined,
    message: moved ? `${code} checked — the step is done` : `${code} checked`,
  };
}

/** The paper goes back with a reason (legacy rejected): its step opens again until a corrected one is filed. */
export async function sendBackRequirement(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = sendBackSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, code, reason } = parsed.data;
  const moved = await giveWord(user.id, { bookingId, code, note: reason, state: "sent_back" });
  if (typeof moved === "string") return fail(moved);
  return {
    ok: true,
    data: undefined,
    message: moved ? `${code} sent back — the step is open again` : `${code} sent back`,
  };
}

/**
 * The paper checked item by item (legacy openChecklist): every item ticked closes the step;
 * anything left unticked becomes its own task for the step's role, and the paper goes back
 * naming what it lacks — it holds up nothing else.
 */
export async function checkWithList(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = checkSchema
    .extend({ list: z.string().regex(/^[a-z][a-z0-9_]{1,29}$/) })
    .safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, code, list: key, reason } = parsed.data;
  const list = (await readChecklists()).find((l) => l.key === key);
  if (!list) return fail("That checklist is no longer in Settings.");
  const ticked = fd.getAll("items").filter((x): x is string => typeof x === "string");
  const missing = missingItems(list, ticked);
  if (missing.length === 0) {
    const moved = await giveWord(user.id, {
      bookingId,
      code,
      note: reason || `${list.label}: complete`,
      state: "checked",
    });
    if (typeof moved === "string") return fail(moved);
    return { ok: true, data: undefined, message: `${code} checked — ${list.label} complete` };
  }
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b) return fail("This booking no longer exists.");
  const role = (await readRuleBook()).find((r) => r.code === codeOfKey(code))?.role ?? "docs_clerk";
  const today = officeToday();
  await db.transaction(async (tx) => {
    for (const item of missing) {
      const title = `${list.label}: ${item.t} — ${b.ref}`;
      const [dup] = await tx
        .select({ id: activities.id })
        .from(activities)
        .where(
          and(
            eq(activities.linkKind, "booking"),
            eq(activities.linkId, bookingId),
            eq(activities.state, "open"),
            eq(activities.title, title),
          ),
        );
      if (dup) continue;
      await tx.insert(activities).values({
        title,
        type: "To do",
        role,
        due: today,
        linkKind: "booking",
        linkId: bookingId,
        note: item.hint ?? null,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }
  });
  const moved = await giveWord(user.id, {
    bookingId,
    code,
    note: `${list.label} — missing: ${missing.map((i) => i.t).join(", ")}${reason ? ` · ${reason}` : ""}`,
    state: "sent_back",
  });
  if (typeof moved === "string") return fail(moved);
  return {
    ok: true,
    data: undefined,
    message: `${code} sent back — ${missing.length} item${missing.length === 1 ? "" : "s"} missing, each its own task`,
  };
}

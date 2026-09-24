"use server";

import { revalidatePath } from "next/cache";
import type { Holiday } from "@/domain/rules/calendar";
import type { DocRule } from "@/domain/rules/engine";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { type CurrentUser, requirePermission } from "@/server/auth/dal";
import { db, type Tx } from "@/server/db/client";
import {
  docRuleSchema,
  holidaySchema,
  invalidateRuleBook,
  readHolidaysForEdit,
  readRuleBookForEdit,
  writeHolidays,
  writeRuleBook,
} from "@/server/rule-book";
import { syncAllBookings } from "@/server/rules-sync";
import { ConflictError } from "@/server/versioned";
import { addHolidaySchema, removeHolidaySchema, ruleFormSchema, toggleRuleSchema } from "./schemas";

/**
 * Saves the table, then re-plans every live booking in a second transaction: the sync reads
 * the rule book through the shared cache and connection, which only see the new rows once
 * the first transaction has committed.
 */
async function saveAndReplan(
  user: CurrentUser,
  write: (tx: Tx) => Promise<void>,
  what: string,
): Promise<ActionResult> {
  try {
    await db.transaction(async (tx) => {
      await write(tx);
      await audit(tx, { action: "rules.save", userId: user.id, entity: "config", entityId: what });
    });
  } catch (e) {
    if (e instanceof ConflictError)
      return fail("Someone changed this table meanwhile. Reload to see it.");
    throw e;
  }
  await invalidateRuleBook();
  const n = await db.transaction((tx) => syncAllBookings(tx, user.id));
  revalidatePath("/settings", "layout");
  revalidatePath("/bookings", "layout");
  revalidatePath("/activity", "layout");
  return {
    ok: true,
    data: undefined,
    message: `Saved · ${n} live booking${n === 1 ? "" : "s"} re-planned`,
  };
}

export async function saveRule(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const form = ruleFormSchema.safeParse(formToObject(fd));
  if (!form.success) return invalid(form.error);
  const { index, version, ...fields } = form.data;
  const rule = docRuleSchema.safeParse({
    ...fields,
    note: fields.note || undefined,
    sold: fields.sold || undefined,
    perBox: fields.perBox || undefined,
  });
  if (!rule.success) return invalid(rule.error);

  const { value: book } = await readRuleBookForEdit();
  const next: DocRule[] = [...book];
  if (index === "new") next.push(rule.data);
  else if (index < next.length) next[index] = rule.data;
  else return fail("That rule no longer exists. Reload the page.");

  // A prerequisite that exists nowhere would block the step for ever (the engine fails closed).
  const known = new Set(next.map((r) => r.code));
  const unknown = rule.data.needs.filter((c) => !known.has(c));
  if (unknown.length)
    return {
      ok: false,
      error: `Unknown prerequisite: ${unknown.join(", ")}`,
      fieldErrors: { needs: [`No rule has the code ${unknown.join(", ")}`] },
    };

  return saveAndReplan(user, (tx) => writeRuleBook(tx, next, version, user.id), "docRules");
}

export async function toggleRule(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = toggleRuleSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { index, version, active } = parsed.data;
  const { value: book } = await readRuleBookForEdit();
  if (!book[index]) return fail("That rule no longer exists. Reload the page.");
  const next = book.map((r, i) => (i === index ? { ...r, active } : r));
  return saveAndReplan(user, (tx) => writeRuleBook(tx, next, version, user.id), "docRules");
}

export async function addHoliday(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const form = addHolidaySchema.safeParse(formToObject(fd));
  if (!form.success) return invalid(form.error);
  const { version, ...h } = form.data;
  const holiday = holidaySchema.safeParse(h);
  if (!holiday.success) return invalid(holiday.error);
  const { value } = await readHolidaysForEdit();
  if (value.some((x) => x.country === h.country && x.date === h.date))
    return fail("That day is already a holiday there.");
  const next: Holiday[] = [...value, holiday.data];
  return saveAndReplan(user, (tx) => writeHolidays(tx, next, version, user.id), "holidays");
}

export async function removeHoliday(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = removeHolidaySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { value } = await readHolidaysForEdit();
  const sorted = [...value].sort((a, b) => a.date.localeCompare(b.date));
  const gone = sorted[parsed.data.index];
  if (!gone) return fail("That holiday no longer exists. Reload the page.");
  const next = value.filter((x) => x !== gone);
  return saveAndReplan(
    user,
    (tx) => writeHolidays(tx, next, parsed.data.version, user.id),
    "holidays",
  );
}

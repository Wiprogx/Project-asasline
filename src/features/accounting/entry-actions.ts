"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseEntryLines, reversalOf } from "@/domain/journal-entries";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { journalEntries } from "@/server/db/schema";
import { nextEntryRef } from "@/server/sequences";
import { assertOpen } from "./books-store";
import { guarded, Refused } from "./invoice-store";
import { journalEntrySchema, reverseEntrySchema } from "./schemas";

const refresh = () => revalidatePath("/accounting", "layout");

/** An entry written by hand (legacy newEntry): balanced, in an open period, numbered OD/YYYY/NNNNN. */
export async function createEntry(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const parsed = journalEntrySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { date, label, lines: typed } = parsed.data;
  const { lines, problem } = parseEntryLines(typed);
  if (problem) return fail(problem);
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      await assertOpen(tx, date);
      const ref = await nextEntryRef(tx, date);
      const [row] = await tx
        .insert(journalEntries)
        .values({ ref, date, label, lines, createdBy: user.id, updatedBy: user.id })
        .returning({ id: journalEntries.id });
      await audit(tx, {
        action: "entry.create",
        userId: user.id,
        entity: "journal_entry",
        entityId: row.id,
        detail: { ref },
      });
      return ref;
    }),
  );
  if (!r.ok) return r;
  refresh();
  return { ok: true, data: undefined, message: `Booked as ${r.value}` };
}

/**
 * Undone by a second entry on today's date, every amount on the other side (legacy
 * cancelEntry); the first stays. An entry is reversed once, and a reversal is not reversed.
 */
export async function reverseEntry(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const parsed = reverseEntrySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, reason } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [e] = await tx.select().from(journalEntries).where(eq(journalEntries.id, id));
      if (!e) throw new Refused("This entry no longer exists.");
      if (e.reversalOf) throw new Refused("A reversal is not reversed; write a new entry.");
      const [done] = await tx
        .select({ ref: journalEntries.ref })
        .from(journalEntries)
        .where(eq(journalEntries.reversalOf, id));
      if (done) throw new Refused(`Already reversed by ${done.ref}.`);
      const today = officeToday();
      await assertOpen(tx, today);
      const ref = await nextEntryRef(tx, today);
      await tx.insert(journalEntries).values({
        ref,
        date: today,
        label: `Reversed · ${e.ref} — ${reason}`,
        lines: reversalOf(e.lines),
        reversalOf: id,
        createdBy: user.id,
        updatedBy: user.id,
      });
      await audit(tx, {
        action: "entry.reverse",
        userId: user.id,
        entity: "journal_entry",
        entityId: id,
        detail: { ref, reason },
      });
      return ref;
    }),
  );
  if (!r.ok) return r;
  refresh();
  return { ok: true, data: undefined, message: `Reversed by ${r.value}` };
}

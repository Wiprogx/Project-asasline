"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { openCents } from "@/domain/payments";
import { remindStep } from "@/domain/reminders";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bookings, invoiceReminders, invoices, messages } from "@/server/db/schema";
import { publish } from "@/server/events";
import { guarded, Refused } from "./invoice-store";
import { creditedSql, settledSql } from "./money";
import { lastReminderSql } from "./reminder-store";
import { reminderSchema } from "./schemas";

/**
 * Records the reminder due on an invoice — as an outgoing e-mail in the messages, and as the
 * invoice's next reminder step — and hands back the link that opens it in the mail app. The
 * step is checked again under a lock, so two people cannot send the same reminder.
 */
export async function writeReminder(
  _p: ActionResult<{ href: string }>,
  fd: FormData,
): Promise<ActionResult<{ href: string }>> {
  const user = await requirePermission("accounting.issue");
  const parsed = reminderSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const today = officeToday();
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [inv] = await tx
        .select({
          id: invoices.id,
          number: invoices.number,
          customerId: invoices.customerId,
          bookingId: invoices.bookingId,
          dueDate: invoices.dueDate,
          gross: invoices.grossCents,
          settled: settledSql,
          credited: creditedSql,
          last: lastReminderSql,
        })
        .from(invoices)
        .where(eq(invoices.id, d.id))
        .for("update");
      if (!inv) throw new Refused("This invoice no longer exists.");
      const step = remindStep({
        dueDate: inv.dueDate,
        openCents: openCents(inv.gross ?? 0, inv.settled, inv.credited),
        today,
        last: inv.last,
      });
      if (!step) throw new Refused(`No reminder is due on ${inv.number} today.`);
      const [b] = inv.bookingId
        ? await tx
            .select({ ref: bookings.ref })
            .from(bookings)
            .where(eq(bookings.id, inv.bookingId))
        : [];
      const [msg] = await tx
        .insert(messages)
        .values({
          channel: "email",
          direction: "out",
          toText: d.toText,
          contactId: inv.customerId,
          subject: d.subject,
          body: d.body,
          linkKind: b ? "booking" : null,
          linkId: b ? inv.bookingId : null,
          linkRef: b?.ref ?? null,
          authorId: user.id,
          createdBy: user.id,
        })
        .returning({ id: messages.id });
      await tx.insert(invoiceReminders).values({
        invoiceId: inv.id,
        level: step.level,
        sentOn: today,
        messageId: msg.id,
        createdBy: user.id,
      });
      await audit(tx, {
        action: "invoice.remind",
        userId: user.id,
        entity: "invoice",
        entityId: inv.id,
        detail: { level: step.level, message: msg.id },
      });
      return { step, bookingId: b ? inv.bookingId : null };
    }),
  );
  if (!r.ok) return r;
  await publish({ type: "message", linkId: r.value.bookingId ?? undefined });
  revalidatePath("/accounting", "layout");
  const href = `mailto:${encodeURIComponent(d.toText)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;
  return {
    ok: true,
    data: { href },
    message: `${r.value.step.name} recorded — opening it to send`,
  };
}

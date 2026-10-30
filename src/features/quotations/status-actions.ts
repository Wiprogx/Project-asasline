"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { cancelProblem, statusAfterRestore } from "@/domain/quotation-status";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db, type DbOrTx } from "@/server/db/client";
import { liveLookupLabel, withdrawReasonIds } from "@/server/lookups";
import { activities, bookings, quotations } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { editorResult, Refused, touchQuotation } from "./editor-store";
import { quotationRef } from "./schemas";
import {
  editQuotationSchema,
  quotationCancelSchema,
  quotationReasonSchema,
  quotationStatusSchema,
} from "./status-schemas";

const LABEL = "This quotation";

async function liveBookings(tx: DbOrTx, quotationId: string) {
  const rows = await tx
    .select({ ref: bookings.ref })
    .from(bookings)
    .where(
      and(
        eq(bookings.quotationId, quotationId),
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
      ),
    );
  return rows.map((r) => r.ref);
}

/** The customer, direction, commodity, document type, validity and terms (legacy editQ). */
export async function updateQuotation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = editQuotationSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  return editorResult(id, "Quotation saved", () =>
    db.transaction(async (tx) => {
      const q = await touchQuotation(tx, id, version, user.id);
      if (q.clientId !== fields.clientId && (await liveBookings(tx, id)).length)
        throw new Refused("This quotation is booked; its customer can no longer change.");
      await tx
        .update(quotations)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(quotations.id, id));
      const changed = Object.keys(fields).filter(
        (k) => q[k as keyof typeof fields] !== fields[k as keyof typeof fields],
      );
      await audit(tx, {
        action: "quotation.edit",
        userId: user.id,
        entity: "quotation",
        entityId: id,
        detail: { changed },
      });
    }),
  );
}

/** Draft, sent or accepted, set by hand (legacy setQSt); a lost one comes back without its reason. */
export async function setQuotationStatus(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = quotationStatusSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, status } = parsed.data;
  return editorResult(id, "Status updated", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, id, version, user.id);
      await tx
        .update(quotations)
        .set({ status, declinedReason: null })
        .where(eq(quotations.id, id));
      await audit(tx, {
        action: "quotation.status",
        userId: user.id,
        entity: "quotation",
        entityId: id,
        detail: { status },
      });
    }),
  );
}

/** The customer said no to the whole quotation (legacy markLost): it keeps its number, never booked. */
export async function rejectQuotation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = quotationReasonSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  return editorResult(id, "Marked as rejected", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, id, version, user.id);
      const booked = await liveBookings(tx, id);
      if (booked.length)
        throw new Refused(`This quotation is booked as ${booked.join(", ")}; it cannot be lost.`);
      await tx
        .update(quotations)
        .set({ status: "declined", declinedReason: reason })
        .where(eq(quotations.id, id));
      await audit(tx, {
        action: "quotation.reject",
        userId: user.id,
        entity: "quotation",
        entityId: id,
        detail: { reason },
      });
    }),
  );
}

/** Cancel keeps the number and the history; its open tasks are withdrawn with the reason. */
export async function cancelQuotation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = quotationCancelSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reasonId } = parsed.data;
  const reason = await liveLookupLabel(db, "cancel-reasons", reasonId);
  if (!reason) return fail("That reason is no longer offered — choose one from the list");
  return editorResult(id, "Quotation cancelled", () =>
    db.transaction(async (tx) => {
      const [q] = await tx.select().from(quotations).where(eq(quotations.id, id));
      if (!q || q.status === "cancelled") throw new ConflictError(LABEL);
      const problem = cancelProblem(await liveBookings(tx, id));
      if (problem) throw new Refused(problem);
      await updateVersioned(
        tx,
        quotations,
        id,
        version,
        {
          status: "cancelled",
          statusBeforeCancel: q.status,
          cancelReasonId: reasonId,
          updatedBy: user.id,
        },
        LABEL,
      );
      await tx
        .update(activities)
        .set({
          state: "withdrawn",
          withdrawReasonId: (await withdrawReasonIds(tx)).quotation_cancelled,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(activities.linkKind, "quotation"),
            eq(activities.linkId, id),
            inArray(activities.state, ["open"]),
          ),
        );
      await audit(tx, {
        action: "quotation.cancel",
        userId: user.id,
        entity: "quotation",
        entityId: id,
        detail: { reason, reasonId },
      });
    }),
  );
}

/** Put back: the quotation returns to the status it had before it was cancelled. */
export async function restoreQuotation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = quotationRef.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;
  return editorResult(id, "Quotation put back", () =>
    db.transaction(async (tx) => {
      const [q] = await tx.select().from(quotations).where(eq(quotations.id, id));
      if (!q || q.status !== "cancelled") throw new ConflictError(LABEL);
      await updateVersioned(
        tx,
        quotations,
        id,
        version,
        {
          status: statusAfterRestore(q.statusBeforeCancel, !!q.sentOn),
          statusBeforeCancel: null,
          cancelReasonId: null,
          updatedBy: user.id,
        },
        LABEL,
      );
      await audit(tx, {
        action: "quotation.restore",
        userId: user.id,
        entity: "quotation",
        entityId: id,
      });
    }),
  );
}

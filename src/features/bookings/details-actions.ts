"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { type ActionResult, formToObject, invalid, nullMissing } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts } from "@/server/db/schema";
import { syncBookingRules } from "@/server/rules-sync";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { bookingDetailsSchema, CLEARABLE_DETAILS } from "./schemas";
import { guarded, Refused } from "./settle";

const PARTIES = ["payerId", "shipperId", "consigneeId", "notifyId"] as const;

/**
 * Saves the editable details. Parties are stored by contact id, never by name (legacy 10.1):
 * each chosen id must be a live contact. A cancelled booking is read-only until put back.
 */
export async function updateBookingDetails(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = bookingDetailsSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  const values = nullMissing(fields, CLEARABLE_DETAILS);

  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        const [cur] = await tx.select().from(bookings).where(eq(bookings.id, id));
        if (!cur) throw new ConflictError("This booking");
        if (cur.status === "cancelled")
          throw new Refused("Put the booking back before editing it.");

        const ids = PARTIES.map((k) => values[k]).filter((v): v is string => typeof v === "string");
        if (ids.length) {
          const live = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(inArray(contacts.id, ids), isNull(contacts.archivedAt)));
          if (live.length !== new Set(ids).size)
            throw new Refused("A chosen party is archived or no longer exists.");
        }

        const changed = Object.keys(values).filter(
          (k) => (values[k] ?? null) !== ((cur as Record<string, unknown>)[k] ?? null),
        );
        if (changed.length === 0) return;
        await updateVersioned(
          tx,
          bookings,
          id,
          version,
          { ...values, updatedBy: user.id },
          "This booking",
        );
        await audit(tx, {
          action: "booking.edit",
          userId: user.id,
          entity: "booking",
          entityId: id,
          detail: { fields: changed },
        });
        await syncBookingRules(tx, id, user.id);
      }),
    "Saved",
  );
}

"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { type ActionResult, formToObject, invalid, nullMissing } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts } from "@/server/db/schema";
import { portIds } from "@/server/ports";
import { syncBookingRules } from "@/server/rules-sync";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { bookingDetailsSchema, CLEARABLE_DETAILS } from "./schemas";
import { PARTY_KEYS } from "@/domain/booking-parties";
import { guarded, Refused } from "./settle";

// Every party the form edits; the customer has its own path (domain/booking-parties).
const PARTIES = PARTY_KEYS.filter((k) => k !== "clientId");

/**
 * Saves the editable details. Parties are stored by contact id, never by name (legacy 10.1):
 * each chosen id must be a live contact. A cancelled booking is read-only until put back.
 */
export async function updateBookingDetails(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = bookingDetailsSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  const { pol, pod, ...details } = nullMissing(fields, CLEARABLE_DETAILS);

  return guarded(
    id,
    () =>
      db.transaction(async (tx) => {
        const [cur] = await tx.select().from(bookings).where(eq(bookings.id, id));
        if (!cur) throw new ConflictError("This booking");
        if (cur.status === "cancelled")
          throw new Refused("Put the booking back before editing it.");
        // The ports typed, as their rows of Settings › Ports.
        const values: Record<string, unknown> = {
          ...details,
          ...(await portIds(tx, { pol: pol as string | null, pod: pod as string | null }, user.id)),
        };

        const picked = values as Record<string, unknown>;
        const ids = PARTIES.map((k) => picked[k]).filter((v): v is string => typeof v === "string");
        if (ids.length) {
          const live = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(inArray(contacts.id, ids), isNull(contacts.archivedAt)));
          if (live.length !== new Set(ids).size)
            throw new Refused("A chosen party is archived or no longer exists.");
        }

        const same = (a: unknown, b: unknown) =>
          Array.isArray(a) ? JSON.stringify(a) === JSON.stringify(b) : a === b;
        const changed = Object.keys(values).filter(
          (k) => !same(values[k] ?? null, (cur as Record<string, unknown>)[k] ?? null),
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

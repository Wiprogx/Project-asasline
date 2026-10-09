import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { DbOrTx } from "./db/client";
import { bookings, contacts, containers } from "./db/schema";
import { signatureOf } from "./messaging";

/** What a booking's letters can say (the booking placeholders of a template), or null when it is gone. */
export async function bookingVars(tx: DbOrTx, bookingId: string, me: string) {
  const [row] = await tx
    .select({ b: bookings, client: contacts.name })
    .from(bookings)
    .leftJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(eq(bookings.id, bookingId));
  if (!row) return null;
  const boxes = await tx
    .select({ number: containers.number, type: containers.type })
    .from(containers)
    .where(and(eq(containers.bookingId, bookingId), isNull(containers.archivedAt)));
  const { b } = row;
  return {
    client: row.client,
    ref: b.ref,
    pol: b.pol,
    dest: b.pod,
    containers: boxes.map((c) => c.number ?? c.type).join(", "),
    vessel: b.vesselName,
    voyage: b.voyage,
    etd: b.etd,
    eta: b.eta,
    docName: b.docType,
    customs: b.customsClosing,
    portcut: b.portCutOff,
    loadDate: b.loadDate,
    loadTime: b.loadTime,
    loadAddress: b.loadAddress,
    me,
    sign: await signatureOf(me),
  };
}

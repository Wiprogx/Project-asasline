import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { DbOrTx } from "./db/client";
import { withLabel } from "./lookups";
import { withPorts } from "./ports";
import { bookings, contacts, containers, docTypes } from "./db/schema";
import { signatureOf } from "./messaging";

/** What a booking's letters can say (the booking placeholders of a template), or null when it is gone. */
/**
 * The booking's words for a letter. With `box` (1, 2…) the trucker copy of that one box: its
 * number and its own loading — the booking's only when there is one box (legacy driverCopyOut).
 */
export async function bookingVars(tx: DbOrTx, bookingId: string, me: string, box?: number) {
  const [row] = await tx
    .select({ b: bookings, client: contacts.name, docName: docTypes.label })
    .from(bookings)
    .leftJoin(contacts, eq(contacts.id, bookings.clientId))
    .leftJoin(docTypes, eq(docTypes.id, bookings.docTypeId))
    .where(eq(bookings.id, bookingId));
  if (!row) return null;
  const rows = await tx
    .select({
      number: containers.number,
      typeId: containers.typeId,
      loadDate: containers.loadDate,
      loadTime: containers.loadTime,
      loadAddress: containers.loadAddress,
    })
    .from(containers)
    .where(and(eq(containers.bookingId, bookingId), isNull(containers.archivedAt)))
    .orderBy(asc(containers.position));
  const boxes = (await withLabel(rows, "container-types", "typeId", "type")).map((c) => ({
    ...c,
    type: c.type ?? "",
  }));
  const [b] = await withPorts([row.b], tx);
  const one = box ? boxes[box - 1] : undefined;
  const single = boxes.length < 2;
  return {
    client: row.client,
    ref: b.ref,
    pol: b.pol,
    dest: b.pod,
    containers: one
      ? `${one.number ?? one.type} (box ${box})`
      : boxes.map((c) => c.number ?? c.type).join(", "),
    vessel: b.vesselName,
    voyage: b.voyage,
    etd: b.etd,
    eta: b.eta,
    docName: row.docName,
    customs: b.customsClosing,
    portcut: b.portCutOff,
    loadDate: one ? (one.loadDate ?? (single ? b.loadDate : null)) : b.loadDate,
    loadTime: one ? (one.loadTime ?? (single ? b.loadTime : null)) : b.loadTime,
    loadAddress: one ? (one.loadAddress ?? (single ? b.loadAddress : null)) : b.loadAddress,
    me,
    sign: await signatureOf(me),
  };
}

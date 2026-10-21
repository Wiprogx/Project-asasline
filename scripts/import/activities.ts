/**
 * Legacy activities → tasks: the person by name among the users, the booking or quotation by
 * its reference, else the contact by name; a rule step keeps its code, per box as the new app
 * names it. Imported as they stood — open, done or withdrawn — never planned again here.
 */
import { isNull } from "drizzle-orm";
import {
  type ActivityLookups,
  boxPosition,
  mapLegacyActivity,
} from "../../src/domain/legacy-activities";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import type { DbOrTx } from "../../src/server/db/client";
import {
  activities,
  bookings,
  containers,
  contacts,
  legacyLinks,
  quotations,
  users,
} from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

const key = (s: string) => s.trim().toLowerCase();

async function lookups(tx: DbOrTx): Promise<ActivityLookups> {
  const [us, bs, qs, cs, boxes] = await Promise.all([
    tx.select({ id: users.id, name: users.name }).from(users),
    tx.select({ id: bookings.id, ref: bookings.ref }).from(bookings),
    tx.select({ id: quotations.id, ref: quotations.ref }).from(quotations),
    tx
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(isNull(contacts.archivedAt)),
    tx
      .select({
        id: containers.id,
        bookingId: containers.bookingId,
        number: containers.number,
        position: containers.position,
      })
      .from(containers)
      .where(isNull(containers.archivedAt)),
  ]);
  const user = new Map(us.map((u) => [key(u.name), u.id]));
  const booking = new Map(bs.map((b) => [b.ref, b.id]));
  const quotation = new Map(qs.map((q) => [q.ref, q.id]));
  const contact = new Map(cs.map((c) => [key(c.name), c.id]));
  return {
    user: (name) => user.get(key(name)) ?? null,
    record: (ref) => {
      const b = booking.get(ref);
      if (b) return { kind: "booking", id: b };
      const q = quotation.get(ref);
      return q ? { kind: "quotation", id: q } : null;
    },
    contact: (name) => contact.get(key(name)) ?? null,
    box: (bookingId, label) => {
      const mine = boxes.filter((b) => b.bookingId === bookingId);
      const at = boxPosition(label);
      const hit =
        mine.find((b) => b.number && b.number === label.toUpperCase().replace(/[\s-]/g, "")) ??
        (at === null ? undefined : mine.find((b) => b.position === at));
      return hit?.id ?? null;
    },
  };
}

export async function importActivities(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "activities");
  const find = await lookups(tx);
  for (const rec of records.filter((r) => r.kind === "activities")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyActivity(rec.body, find);
    if (!m) {
      report.skipped.push(`activity ${rec.id}: no title`);
      continue;
    }
    for (const w of m.warnings) report.warnings.push(`"${m.task.title}": ${w}`);
    const archived = rec.archived
      ? { archivedAt: new Date(), archivedReason: "Archived in the legacy office" }
      : {};
    const [row] = await tx
      .insert(activities)
      .values({ ...m.task, ...archived })
      .returning({ id: activities.id });
    report.added++;
    await tx.insert(legacyLinks).values({ kind: "activities", legacyId: rec.id, recordId: row.id });
    links.set(rec.id, row.id);
  }
  return report;
}

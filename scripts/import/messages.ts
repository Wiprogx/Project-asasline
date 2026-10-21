/**
 * Legacy messages → messages: authors and takers by name among the users, the record by its
 * reference, replies tied in a second pass once every message has its new id. Times are the
 * office's ("YYYY-MM-DD HH:MM" in its time zone), turned into instants here.
 */
import { eq } from "drizzle-orm";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { mapLegacyMessage } from "../../src/domain/legacy-messages";
import type { DbOrTx } from "../../src/server/db/client";
import { bookings, legacyLinks, messages, quotations, users } from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

const ZONE = process.env.APP_TIMEZONE || "Europe/Brussels";

/** "2026-09-21 10:32" in the office's zone, as an instant. */
function officeInstant(stamp: string): Date {
  const [d, t = "12:00"] = stamp.split(" ");
  const asUtc = new Date(`${d}T${t}:00Z`);
  // The zone's offset at that moment: how its wall clock differs from UTC's.
  const wall = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(asUtc);
  const [wd, wt] = wall.split(", ");
  const offset = new Date(`${wd}T${wt}:00Z`).getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}

export async function importMessages(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "messages");
  const [us, bs, qs] = await Promise.all([
    tx.select({ id: users.id, name: users.name }).from(users),
    tx.select({ id: bookings.id, ref: bookings.ref }).from(bookings),
    tx.select({ id: quotations.id, ref: quotations.ref }).from(quotations),
  ]);
  const user = new Map(us.map((u) => [u.name.trim().toLowerCase(), u.id]));
  const byName = (n: string | null) => (n ? (user.get(n.toLowerCase()) ?? null) : null);
  const record = (ref: string | null) => {
    if (!ref) return null;
    const b = bs.find((x) => x.ref === ref);
    if (b) return { kind: "booking", id: b.id };
    const q = qs.find((x) => x.ref === ref);
    return q ? { kind: "quotation", id: q.id } : null;
  };
  const replies: { id: string; legacyReplyTo: string }[] = [];
  for (const rec of records.filter((r) => r.kind === "MESSAGES")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyMessage(rec.body);
    if ("skip" in m) {
      report.skipped.push(`message ${rec.id}: ${m.skip}`);
      continue;
    }
    for (const w of m.warnings) report.warnings.push(`message ${rec.id}: ${w}`);
    const linked = record(m.message.linkRef);
    if (m.message.linkRef && !linked)
      report.warnings.push(`message ${rec.id}: its record ${m.message.linkRef} was not found`);
    const at = officeInstant(m.at);
    const [row] = await tx
      .insert(messages)
      .values({
        ...m.message,
        at,
        linkKind: linked?.kind ?? null,
        linkId: linked?.id ?? null,
        authorId: byName(m.people.author),
        claimedBy: byName(m.people.claimedBy),
        claimedAt: m.people.claimedAt ? officeInstant(m.people.claimedAt) : null,
        deliveredAt: m.delivered ? at : null,
        escalatedAt: m.escalated ? at : null,
      })
      .returning({ id: messages.id });
    if (m.legacyReplyTo) replies.push({ id: row.id, legacyReplyTo: m.legacyReplyTo });
    report.added++;
    await tx.insert(legacyLinks).values({ kind: "messages", legacyId: rec.id, recordId: row.id });
    links.set(rec.id, row.id);
  }
  for (const r of replies) {
    const to = links.get(r.legacyReplyTo);
    if (to) await tx.update(messages).set({ replyToId: to }).where(eq(messages.id, r.id));
  }
  return report;
}

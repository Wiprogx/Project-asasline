/**
 * Legacy bookings → bookings, their boxes and alerts. The SB number is kept as issued; each
 * party is the imported contact (legacy id, else name); the booking points at its quotation and
 * the destination it shipped (legacy quoteRef + routeId), its ports from its ocean leg. A
 * booking the app already holds by its number is linked, not added twice. Document steps are
 * not planned here: the legacy tasks come with the activities.
 */
import { and, eq, isNull } from "drizzle-orm";
import { mapLegacyBooking } from "../../src/domain/legacy-bookings";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import type { DbOrTx } from "../../src/server/db/client";
import {
  bookingAlerts,
  bookings,
  containers,
  contacts,
  legacyLinks,
  quotationRoutes,
  quotations,
  rateItems,
} from "../../src/server/db/schema";
import { lookupIdFor } from "./lookups";
import { replaceGoods, resolveGoods } from "../../src/server/container-goods";
import { ensureLookup } from "../../src/server/lookups";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

const ARCHIVED = "Archived in the legacy office";

async function partyLookup(tx: DbOrTx) {
  const links = await linksOf(tx, "contacts");
  const rows = await tx
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(isNull(contacts.archivedAt));
  const byName = new Map(rows.map((r) => [r.name.trim().toLowerCase(), r.id]));
  return (legacyId: unknown, name: unknown) =>
    links.get(String(legacyId ?? "")) ??
    byName.get(
      String(name ?? "")
        .trim()
        .toLowerCase(),
    ) ??
    null;
}

/** The quotation and the destination a legacy booking came from, in the new app. */
async function originOf(tx: DbOrTx, records: readonly LegacyRecord[], b: Record<string, unknown>) {
  const ref = typeof b.quoteRef === "string" ? b.quoteRef : "";
  if (!ref) return { quotationId: null, routeId: null };
  const [q] = await tx
    .select({ id: quotations.id })
    .from(quotations)
    .where(eq(quotations.ref, ref));
  if (!q) return { quotationId: null, routeId: null };
  const legacyQ = records.find((r) => r.kind === "quotations" && r.body.ref === ref);
  const legacyRoutes = Array.isArray(legacyQ?.body.routes)
    ? (legacyQ.body.routes as Record<string, unknown>[])
    : [];
  const at = legacyRoutes.findIndex((r) => String(r?.id) === String(b.routeId));
  const routes = await tx
    .select({ id: quotationRoutes.id, position: quotationRoutes.position })
    .from(quotationRoutes)
    .where(eq(quotationRoutes.quotationId, q.id));
  const route =
    routes.find((r) => r.position === at) ?? (routes.length === 1 ? routes[0] : undefined);
  return { quotationId: q.id, routeId: route?.id ?? null };
}

async function portsOf(tx: DbOrTx, laneId: unknown) {
  if (laneId === null || laneId === undefined) return null;
  const [row] = await tx
    .select({ polId: rateItems.polId, podId: rateItems.podId })
    .from(legacyLinks)
    .innerJoin(rateItems, eq(rateItems.id, legacyLinks.recordId))
    .where(and(eq(legacyLinks.kind, "RATE_ITEMS"), eq(legacyLinks.legacyId, String(laneId))));
  return row ?? null;
}

export async function importBookings(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "bookings");
  const party = await partyLookup(tx);
  const vesselLinks = await linksOf(tx, "VESSELS");
  for (const rec of records.filter((r) => r.kind === "bookings")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyBooking(rec.body, party);
    if (!m) {
      report.skipped.push(`booking ${rec.id}: no reference`);
      continue;
    }
    const { clientId, cancelReasonLabel, docTypeLabel, ...rest } = m.booking;
    if (!clientId) {
      report.skipped.push(
        `${m.booking.ref}: customer "${String(rec.body.client ?? "?")}" not found`,
      );
      continue;
    }
    for (const w of m.warnings) report.warnings.push(`${m.booking.ref}: ${w}`);
    const [known] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.ref, m.booking.ref));
    let id = known?.id;
    if (id) report.matched++;
    else {
      const origin = await originOf(tx, records, rec.body);
      const ports = await portsOf(tx, rec.body.laneId);
      const archived = rec.archived ? { archivedAt: new Date(), archivedReason: ARCHIVED } : {};
      [{ id }] = await tx
        .insert(bookings)
        .values({
          ...rest,
          clientId,
          cancelReasonId: await lookupIdFor(tx, "cancel-reasons", cancelReasonLabel),
          docTypeId: (await lookupIdFor(tx, "doc-types", docTypeLabel))!,
          quotationId: origin.quotationId,
          quotationRouteId: origin.routeId,
          vesselId: vesselLinks.get(String(rec.body.vesselId ?? "")) ?? null,
          polId: ports?.polId ?? null,
          podId: ports?.podId ?? null,
          ...archived,
        })
        .returning({ id: bookings.id });
      for (const { seals, hsLines, packageType, type, ...box } of m.containers) {
        // A word no Settings list holds (package type, seal source): the box without its goods.
        const goods = await resolveGoods(tx, { seals, hsLines, packageType });
        if (goods.problem !== null)
          report.warnings.push(`${m.booking.ref}: ${goods.problem} — goods left off the box`);
        const ok = goods.problem === null ? goods : null;
        const [made] = await tx
          .insert(containers)
          .values({
            ...box,
            bookingId: id!,
            typeId: await ensureLookup(tx, "container-types", type),
            packageTypeId: ok?.packageTypeId ?? null,
          })
          .returning({ id: containers.id });
        if (ok) await replaceGoods(tx, made.id, ok, null);
      }
      if (m.alerts.length)
        await tx.insert(bookingAlerts).values(
          m.alerts.map((a) => ({
            bookingId: id!,
            level: a.level,
            text: a.text,
            resolvedAt: a.resolved ? new Date() : null,
          })),
        );
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "bookings", legacyId: rec.id, recordId: id! });
    links.set(rec.id, id!);
  }
  return report;
}

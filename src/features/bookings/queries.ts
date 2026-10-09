import "server-only";
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import type { BookingStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { auditLog, bookings, containers, contacts, users } from "@/server/db/schema";
import { billMatches, billStatus, type BillFilter, type BillStatus } from "@/domain/invoicing";

/** A malformed id is "not found", never a database error (pages render beside their layout). */
const isUuid = (id: string) => z.uuid().safeParse(id).success;

export type BookingRow = {
  id: string;
  ref: string;
  status: BookingStatus;
  kind: "export" | "import" | "both";
  clientName: string;
  pol: string | null;
  pod: string | null;
  loadDate: string | null;
  etd: string | null;
  /** What the destination sold, and what issued invoices took of it (legacy bTotal / billedAmount). */
  valueCents: number;
  billedCents: number;
  billing: BillStatus;
};

/** The destination's lines sold: qty × boxes for a per-container line, terms bill nothing. */
const valueOf = sql<number>`(select coalesce(sum(ql.qty * (case when ql.per_box then greatest(1, qr.boxes) else 1 end) * ql.sell_cents), 0)
  from quotation_lines ql join quotation_routes qr on qr.id = ql.route_id
  where ql.route_id = ${bookings.quotationRouteId} and ql.archived_at is null and ql.condition = false and ql.sell_cents > 0)::int`;
/** Issued sales invoices and credit notes against the quotation's lines (extras added by hand are on top). */
const billedOf = sql<number>`(select coalesce(sum((case when i.kind = 'credit' then -1 else 1 end) * il.qty * il.unit_cents), 0)
  from invoice_lines il join invoices i on i.id = il.invoice_id
  where i.booking_id = ${bookings.id} and i.status = 'issued' and i.kind <> 'bill' and il.archived_at is null and il.source_key like 'q:%')::int`;

export async function listBookings(
  opts: {
    q?: string;
    status?: BookingStatus;
    cancelled?: boolean;
    contactId?: string;
    billing?: BillFilter;
  } = {},
) {
  await requirePermission("app.bookings");
  const q = opts.q?.trim() ?? "";
  const key = `bookings:list:${opts.status ?? "*"}:${!!opts.cancelled}:${opts.contactId ?? "*"}:${q.toLowerCase()}`;
  const rows = await cached(
    key,
    { ttlSeconds: 30, tags: [tags.bookings] },
    async (): Promise<BookingRow[]> => {
      const where: SQL[] = [];
      if (opts.status) where.push(eq(bookings.status, opts.status));
      else if (!opts.cancelled) where.push(ne(bookings.status, "cancelled"));
      // A contact's bookings: every one it is a party on (customer, payer, shipper, consignee, notify).
      if (opts.contactId)
        where.push(
          or(
            eq(bookings.clientId, opts.contactId),
            eq(bookings.payerId, opts.contactId),
            eq(bookings.shipperId, opts.contactId),
            eq(bookings.consigneeId, opts.contactId),
            eq(bookings.notifyId, opts.contactId),
          )!,
        );
      if (q) {
        const like = `%${q}%`;
        where.push(
          or(
            ilike(bookings.ref, like),
            ilike(contacts.name, like),
            ilike(bookings.carrierBookingNo, like),
            ilike(bookings.blNo, like),
            ilike(bookings.pod, like),
          )!,
        );
      }
      const rows = await db
        .select({
          id: bookings.id,
          ref: bookings.ref,
          status: bookings.status,
          kind: bookings.kind,
          clientName: contacts.name,
          pol: bookings.pol,
          pod: bookings.pod,
          loadDate: bookings.loadDate,
          etd: bookings.etd,
          valueCents: valueOf,
          billedCents: billedOf,
        })
        .from(bookings)
        .innerJoin(contacts, eq(contacts.id, bookings.clientId))
        .where(and(...where))
        .orderBy(desc(bookings.ref))
        .limit(500);
      return rows.map((r) => ({ ...r, billing: billStatus(r.valueCents, r.billedCents) }));
    },
  );
  return rows.filter((r) => billMatches(r.billing, opts.billing));
}

/** One booking with its parties and live boxes; cached per request (layout + page share it). */
export const getBooking = cache(async (id: string) => {
  await requirePermission("app.bookings");
  if (!isUuid(id)) return undefined;
  return db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: {
      client: { columns: { id: true, name: true, country: true } },
      payer: { columns: { id: true, name: true } },
      shipper: { columns: { id: true, name: true } },
      consignee: { columns: { id: true, name: true } },
      notify: { columns: { id: true, name: true } },
      quotation: { columns: { id: true, ref: true } },
      /** The register's dates, to see a date typed over them (domain/vessels scheduleConflict). */
      vessel: { columns: { id: true, etd: true, eta: true } },
      containers: { where: isNull(containers.archivedAt), orderBy: asc(containers.position) },
    },
  });
});

/** The booking's own audit trail, newest first (status, edits, boxes, cancel). */
export async function bookingHistory(id: string) {
  await requirePermission("app.bookings");
  if (!isUuid(id)) return [];
  return db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      action: auditLog.action,
      detail: auditLog.detail,
      who: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .where(and(eq(auditLog.entity, "booking"), eq(auditLog.entityId, id)))
    .orderBy(desc(auditLog.id))
    .limit(300);
}

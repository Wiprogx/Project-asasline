import "server-only";
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import type { BookingStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { auditLog, bookings, containers, contacts, users } from "@/server/db/schema";

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
};

export async function listBookings(
  opts: { q?: string; status?: BookingStatus; cancelled?: boolean } = {},
) {
  await requirePermission("app.bookings");
  const q = opts.q?.trim() ?? "";
  const key = `bookings:list:${opts.status ?? "*"}:${!!opts.cancelled}:${q.toLowerCase()}`;
  return cached(key, { ttlSeconds: 30, tags: [tags.bookings] }, async (): Promise<BookingRow[]> => {
    const where: SQL[] = [];
    if (opts.status) where.push(eq(bookings.status, opts.status));
    else if (!opts.cancelled) where.push(ne(bookings.status, "cancelled"));
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
    return db
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
      })
      .from(bookings)
      .innerJoin(contacts, eq(contacts.id, bookings.clientId))
      .where(and(...where))
      .orderBy(desc(bookings.ref))
      .limit(500);
  });
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

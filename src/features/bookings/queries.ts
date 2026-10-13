import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { auditLog, bookings, containers, users } from "@/server/db/schema";

/** A malformed id is "not found", never a database error (pages render beside their layout). */
const isUuid = (id: string) => z.uuid().safeParse(id).success;

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
      docCheck: { columns: { id: true, name: true } },
      shippingCo: { columns: { id: true, name: true } },
      transporter: { columns: { id: true, name: true } },
      destForwarder: { columns: { id: true, name: true } },
      forwarder: { columns: { id: true, name: true } },
      customsAgent: { columns: { id: true, name: true } },
      quotation: { columns: { id: true, ref: true, version: true } },
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

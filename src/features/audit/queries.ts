import "server-only";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { auditLog, bookings, quotations, users } from "@/server/db/schema";
import { officeZone } from "@/server/clock";

const officeDay = sql`(${auditLog.at} at time zone ${officeZone()})::date`;

/** The newest entries first; `action` filters by prefix ("login", "booking.", "user."). */
export async function listAudit(opts: { action?: string; limit?: number } = {}) {
  await requirePermission("audit.view");
  return db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      detail: auditLog.detail,
      ip: auditLog.ip,
      who: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .where(opts.action ? ilike(auditLog.action, `${opts.action}%`) : undefined)
    .orderBy(desc(auditLog.id))
    .limit(Math.min(opts.limit ?? 200, 1000));
}

export type AuditRow = Awaited<ReturnType<typeof listAudit>>[number];

/**
 * What one person did in a window (legacy userSummary / userTimeline): their audit lines,
 * newest first, each with the SB or QT number it touched when it touched one.
 */
export async function personLog(userId: string, window: { from: string | null; to: string }) {
  await requirePermission("audit.view");
  const [person] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, userId));
  if (!person) return null;
  const rows = await db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      detail: auditLog.detail,
      ip: auditLog.ip,
      who: users.name,
      ref: sql<string | null>`coalesce(${bookings.ref}, ${quotations.ref})`,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .leftJoin(
      bookings,
      and(eq(auditLog.entity, "booking"), sql`${bookings.id}::text = ${auditLog.entityId}`),
    )
    .leftJoin(
      quotations,
      and(eq(auditLog.entity, "quotation"), sql`${quotations.id}::text = ${auditLog.entityId}`),
    )
    .where(
      and(
        eq(auditLog.userId, userId),
        // The day as the office counts it (invariant 4): the instant read in the office's zone.
        window.from ? sql`${officeDay} >= ${window.from}::date` : undefined,
        sql`${officeDay} <= ${window.to}::date`,
      ),
    )
    .orderBy(desc(auditLog.id))
    .limit(1000);
  return { person, rows };
}

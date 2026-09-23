import "server-only";
import { desc, eq, ilike } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { auditLog, users } from "@/server/db/schema";

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

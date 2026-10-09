import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { auditLog, users } from "@/server/db/schema";

/** The quotation's own audit trail, newest first (created, sent, destinations, lines, accepted). */
export async function quotationHistory(id: string) {
  await requirePermission("app.quotations");
  if (!z.uuid().safeParse(id).success) return [];
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
    .where(and(eq(auditLog.entity, "quotation"), eq(auditLog.entityId, id)))
    .orderBy(desc(auditLog.id))
    .limit(300);
}

import type { DbOrTx } from "./db/client";
import { auditLog } from "./db/schema";

export type AuditEntry = {
  action: string;
  userId?: string | null;
  entity?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  ip?: string | null;
};

/** Append-only. Write it in the same transaction as the change it describes. */
export async function audit(db: DbOrTx, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values(entry);
}

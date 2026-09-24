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

/** Several entries in one insert: a bulk change writes one line per record it touched. */
export async function auditMany(db: DbOrTx, entries: readonly AuditEntry[]): Promise<void> {
  for (let i = 0; i < entries.length; i += 1000)
    await db.insert(auditLog).values(entries.slice(i, i + 1000));
}

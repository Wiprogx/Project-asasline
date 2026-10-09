import "server-only";
import { type AccessKey, watching } from "@/domain/access";
import { readAccessWatch } from "./access-config";
import { type AuditEntry, audit } from "./audit";
import { db } from "./db/client";

/**
 * An act of looking, written to the audit log when the office said it should be (legacy
 * auditAccess): the cost of a shipment, a download, an export, another person's record, a
 * customer's prices. Nothing is written for a key the table has switched off.
 */
export async function auditAccess(key: AccessKey, entry: AuditEntry): Promise<boolean> {
  if (!watching(await readAccessWatch(), key)) return false;
  await audit(db, entry);
  return true;
}

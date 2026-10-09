import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { invoiceFiles, users } from "@/server/db/schema";
import { openStoredFile } from "@/server/files";
import { auditAccess } from "@/server/access";

/** The files kept with an invoice or a bill, newest first, with who attached them and the day. */
export async function invoiceAttachments(invoiceId: string) {
  await requirePermission("app.accounting");
  const rows = await db
    .select({
      id: invoiceFiles.id,
      name: invoiceFiles.name,
      sizeBytes: invoiceFiles.sizeBytes,
      note: invoiceFiles.note,
      createdAt: invoiceFiles.createdAt,
      by: users.name,
    })
    .from(invoiceFiles)
    .leftJoin(users, eq(users.id, invoiceFiles.createdBy))
    .where(and(eq(invoiceFiles.invoiceId, invoiceId), isNull(invoiceFiles.archivedAt)))
    .orderBy(desc(invoiceFiles.createdAt));
  return rows.map(({ createdAt, ...f }) => ({ ...f, on: officeToday(createdAt) }));
}

/** A file to send to the browser: its stream and headers, or null when it is not there. */
export async function invoiceFileForDownload(invoiceId: string, fileId: string) {
  const user = await requirePermission("app.accounting");
  const [f] = await db
    .select()
    .from(invoiceFiles)
    .where(and(eq(invoiceFiles.id, fileId), eq(invoiceFiles.invoiceId, invoiceId)));
  if (!f) return null;
  const stream = await openStoredFile(invoiceId, f.storedName, "invoices");
  if (stream)
    await auditAccess("download", {
      action: "file.download",
      userId: user.id,
      entity: "invoice",
      entityId: invoiceId,
      detail: { file: f.id, name: f.name },
    });
  return stream ? { stream, name: f.name, mime: f.mime, size: f.sizeBytes } : null;
}

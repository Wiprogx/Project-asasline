"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ALLOWED_TYPES, extensionOf, fileProblem } from "@/domain/files";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { invoiceFiles, invoices } from "@/server/db/schema";
import { storeFile } from "@/server/files";
import { invoiceFileSchema, removeInvoiceFileSchema } from "./schemas";

/** Keeps a file with an invoice or a bill (legacy attachments): the supplier's PDF, a proof, the UBL. */
export async function attachInvoiceFile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.accounting");
  const parsed = invoiceFileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file.");
  const problem = fileProblem(file);
  if (problem) return fail(problem);
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, parsed.data.invoiceId));
  if (!inv) return fail("This document no longer exists.");
  const ext = extensionOf(file.name);
  const storedName = `${randomUUID()}${ext}`;
  await storeFile(inv.id, storedName, new Uint8Array(await file.arrayBuffer()), "invoices");
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(invoiceFiles)
      .values({
        invoiceId: inv.id,
        name: file.name.trim().slice(0, 200),
        storedName,
        mime: ALLOWED_TYPES[ext] ?? "application/octet-stream",
        sizeBytes: file.size,
        note: parsed.data.note || null,
        createdBy: user.id,
      })
      .returning({ id: invoiceFiles.id });
    await audit(tx, {
      action: "invoice.file.add",
      userId: user.id,
      entity: "invoice",
      entityId: inv.id,
      detail: { file: row.id, name: file.name },
    });
  });
  revalidatePath(`/accounting/invoices/${inv.id}`);
  return { ok: true, data: undefined, message: `Attached — ${file.name}` };
}

/** Taken off with a reason; the bytes and the record stay. */
export async function removeInvoiceFile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.accounting");
  const parsed = removeInvoiceFileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { invoiceId, fileId, reason } = parsed.data;
  const rows = await db
    .update(invoiceFiles)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(
      and(
        eq(invoiceFiles.id, fileId),
        eq(invoiceFiles.invoiceId, invoiceId),
        isNull(invoiceFiles.archivedAt),
      ),
    )
    .returning({ id: invoiceFiles.id });
  if (rows.length === 0) return fail("This file is no longer on the document.");
  await audit(db, {
    action: "invoice.file.remove",
    userId: user.id,
    entity: "invoice",
    entityId: invoiceId,
    detail: { file: fileId, reason },
  });
  revalidatePath(`/accounting/invoices/${invoiceId}`);
  return { ok: true, data: undefined, message: "Taken off the document" };
}

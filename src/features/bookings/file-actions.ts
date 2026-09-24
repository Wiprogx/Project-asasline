"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ALLOWED_TYPES, extensionOf, fileCodeOf, fileProblem } from "@/domain/files";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookingFiles, bookings } from "@/server/db/schema";
import { readFileHints } from "@/server/file-config";
import { storeFile } from "@/server/files";
import { archiveFileSchema, fileMetaSchema, refileSchema } from "./file-schemas";
import { settleStep } from "./file-store";

const refresh = (bookingId: string) => {
  revalidatePath(`/bookings/${bookingId}`, "layout");
  revalidatePath("/activity");
};

/**
 * Files a document on the booking: the bytes go to the files folder, the record says what it
 * is. The code comes from the name (Settings › Filing rules) unless the person chose one. Filed
 * against a document step, it settles that step, and the steps waiting on it open.
 */
export async function uploadFile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = fileMetaSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const file = fd.get("file");
  if (!(file instanceof File)) return fail("Choose a file.");
  const problem = fileProblem(file);
  if (problem) return fail(problem);
  const [b] = await db.select().from(bookings).where(eq(bookings.id, d.bookingId));
  if (!b) return fail("This booking no longer exists.");
  if (b.status === "cancelled") return fail("Put the booking back before filing on it.");

  const ext = extensionOf(file.name);
  const code = d.code ?? d.ruleCode ?? fileCodeOf(file.name, await readFileHints());
  const storedName = `${randomUUID()}${ext}`;
  await storeFile(b.id, storedName, new Uint8Array(await file.arrayBuffer()));
  const [row] = await db
    .insert(bookingFiles)
    .values({
      bookingId: b.id,
      containerId: d.containerId,
      name: file.name.trim().slice(0, 200),
      storedName,
      mime: ALLOWED_TYPES[ext] ?? "application/octet-stream",
      sizeBytes: file.size,
      code,
      stage: d.stage,
      ruleCode: d.ruleCode,
      note: d.note || null,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: bookingFiles.id });
  const settled =
    d.ruleCode && d.stage === "final" ? await settleStep(db, b.id, d.ruleCode, user.id) : false;
  await audit(db, {
    action: "booking.file.add",
    userId: user.id,
    entity: "booking",
    entityId: b.id,
    detail: { file: row.id, name: file.name, code, stage: d.stage, ruleCode: d.ruleCode },
  });
  refresh(b.id);
  return {
    ok: true,
    data: undefined,
    message: settled
      ? `Filed as ${code} — the step is done`
      : code
        ? `Filed as ${code}`
        : "Filed — give it a code so the requirements see it",
  };
}

/** Changes what a file is filed as; made final against a step, it settles that step. */
export async function refileFile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = refileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, fileId, ...f } = parsed.data;
  const [row] = await db
    .update(bookingFiles)
    .set({ ...f, updatedBy: user.id, updatedAt: new Date() })
    .where(
      and(
        eq(bookingFiles.id, fileId),
        eq(bookingFiles.bookingId, bookingId),
        isNull(bookingFiles.archivedAt),
      ),
    )
    .returning({ id: bookingFiles.id });
  if (!row) return fail("This file is no longer on the booking.");
  const settled =
    f.ruleCode && f.stage === "final"
      ? await settleStep(db, bookingId, f.ruleCode, user.id)
      : false;
  await audit(db, {
    action: "booking.file.refile",
    userId: user.id,
    entity: "booking",
    entityId: bookingId,
    detail: { file: fileId, ...f },
  });
  refresh(bookingId);
  return { ok: true, data: undefined, message: settled ? "Saved — the step is done" : "Saved" };
}

/** Taken off the booking with a reason; the bytes and the record stay. */
export async function archiveFile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = archiveFileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, fileId, reason } = parsed.data;
  await db
    .update(bookingFiles)
    .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
    .where(and(eq(bookingFiles.id, fileId), eq(bookingFiles.bookingId, bookingId)));
  await audit(db, {
    action: "booking.file.archive",
    userId: user.id,
    entity: "booking",
    entityId: bookingId,
    detail: { file: fileId, reason },
  });
  refresh(bookingId);
  return { ok: true, data: undefined, message: "Taken off the booking" };
}

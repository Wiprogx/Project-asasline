import "server-only";
import { and, eq } from "drizzle-orm";
import { type FileStage, requirementsOf, type ReviewState } from "@/domain/files";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bookingFiles, users } from "@/server/db/schema";
import { readFileHints } from "@/server/file-config";
import { openStoredFile } from "@/server/files";
import { bookingChain } from "@/server/rules-sync";
import { destinationDocs, liveFiles } from "./file-store";
import { latestReviews } from "./review-store";
import { getBooking } from "./queries";
import { auditAccess } from "@/server/access";
import { readChecklists } from "@/server/checklist-config";

/**
 * The Documents tab in one read: the chain, the files, the papers the shipment still lacks,
 * and the codes the upload form offers (the filing rules' and the steps').
 */
export async function bookingDocuments(id: string) {
  await requirePermission("app.bookings");
  const b = await getBooking(id);
  if (!b) return null;
  const [steps, files, docs, hints, reviews, checklists] = await Promise.all([
    bookingChain(db, b),
    liveFiles(db, b.id),
    destinationDocs(db, b.pod),
    readFileHints(),
    latestReviews(db, b.id),
    readChecklists(),
  ]);
  const byUser = new Map(
    (await db.select({ id: users.id, name: users.name }).from(users)).map((u) => [u.id, u.name]),
  );
  const requirements = requirementsOf({
    destinationDocs: docs,
    steps: steps.map((s) => ({
      code: s.key,
      doc: s.box ? `${s.rule.doc} — ${s.box.label}` : s.rule.doc,
      status: s.status,
      checklist: s.rule.checklist ?? null,
      need: s.rule.need,
    })),
    files: files.map((f) => ({
      code: f.code,
      ruleCode: f.ruleCode,
      stage: f.stage as FileStage,
      at: f.createdAt.toISOString(),
    })),
    reviews: reviews.map((r) => ({
      code: r.code,
      state: r.state as ReviewState,
      note: r.note,
      at: r.createdAt.toISOString(),
    })),
  });
  const codes = [
    ...new Set([
      ...hints.map((h) => h.code),
      ...docs.map((d) => d.code),
      ...steps.map((s) => s.rule.code),
    ]),
  ].sort();
  return {
    booking: b,
    steps,
    // The day it was filed, as the office counts days (invariant 4), never the UTC instant's.
    files: files.map((f) => ({
      ...f,
      by: byUser.get(f.createdBy ?? "") ?? "—",
      filedOn: officeToday(f.createdAt),
    })),
    requirements,
    checklists,
    /** Who gave the word on each paper, and the day. */
    reviewed: Object.fromEntries(
      reviews.map((r) => [
        r.code,
        `${byUser.get(r.createdBy ?? "") ?? "—"} · ${officeToday(r.createdAt)}`,
      ]),
    ),
    codes,
    openSteps: steps
      .filter((s) => s.status !== "done")
      .map((s) => ({ code: s.key, doc: s.box ? `${s.rule.doc} — ${s.box.label}` : s.rule.doc })),
  };
}

/** A file to send to the browser: its stream and headers, or null when it is not there. */
export async function fileForDownload(bookingId: string, fileId: string) {
  const user = await requirePermission("app.bookings");
  const [f] = await db
    .select()
    .from(bookingFiles)
    .where(and(eq(bookingFiles.id, fileId), eq(bookingFiles.bookingId, bookingId)));
  if (!f) return null;
  const stream = await openStoredFile(bookingId, f.storedName);
  if (stream)
    await auditAccess("download", {
      action: "file.download",
      userId: user.id,
      entity: "booking",
      entityId: bookingId,
      detail: { file: f.id, name: f.name },
    });
  return stream ? { stream, name: f.name, mime: f.mime, size: f.sizeBytes } : null;
}

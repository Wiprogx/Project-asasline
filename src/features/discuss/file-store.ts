import "server-only";
import { randomUUID } from "node:crypto";
import { ALLOWED_TYPES, extensionOf, fileCodeOf, fileProblem } from "@/domain/files";
import { audit } from "@/server/audit";
import type { DbOrTx } from "@/server/db/client";
import { bookingFiles, messageFiles } from "@/server/db/schema";
import { readFileHints } from "@/server/file-config";
import { storeFile } from "@/server/files";

// Internal to Discuss: the actions call this after their permission check.

/** The files a form sent, or why one of them cannot be kept. */
export function filesOf(fd: FormData): { files: File[]; problem: string | null } {
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) {
    const problem = fileProblem(f);
    if (problem) return { files, problem };
  }
  return { files, problem: null };
}

/**
 * Keeps what came with a message (legacy files[]): the bytes under the message, the record on
 * it — and, when the message is on a shipment, the same paper filed on that shipment under the
 * code its name suggests, so the Documents tab sees it without a second upload.
 */
export async function attachFiles(
  tx: DbOrTx,
  p: {
    messageId: string;
    files: File[];
    link: { kind: string; id: string } | null;
    userId: string;
  },
) {
  if (p.files.length === 0) return { attached: 0, filed: 0 };
  const hints = p.link?.kind === "booking" ? await readFileHints() : [];
  let filed = 0;
  for (const f of p.files) {
    const ext = extensionOf(f.name);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const name = f.name.trim().slice(0, 200);
    const mime = ALLOWED_TYPES[ext] ?? "application/octet-stream";
    const storedName = `${randomUUID()}${ext}`;
    await storeFile(p.messageId, storedName, bytes, "messages");
    await tx.insert(messageFiles).values({
      messageId: p.messageId,
      name,
      storedName,
      mime,
      sizeBytes: f.size,
      createdBy: p.userId,
    });
    if (p.link?.kind !== "booking") continue;
    const onBooking = `${randomUUID()}${ext}`;
    await storeFile(p.link.id, onBooking, bytes);
    const code = fileCodeOf(name, hints);
    const [row] = await tx
      .insert(bookingFiles)
      .values({
        bookingId: p.link.id,
        name,
        storedName: onBooking,
        mime,
        sizeBytes: f.size,
        code,
        stage: "final",
        note: "Came with a message",
        createdBy: p.userId,
        updatedBy: p.userId,
      })
      .returning({ id: bookingFiles.id });
    await audit(tx, {
      action: "booking.file.add",
      userId: p.userId,
      entity: "booking",
      entityId: p.link.id,
      detail: { file: row.id, name, code, stage: "final", fromMessage: p.messageId },
    });
    filed++;
  }
  return { attached: p.files.length, filed };
}

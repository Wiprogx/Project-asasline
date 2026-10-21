/**
 * Legacy files → the files of each booking they were filed on: the bytes stored once per
 * booking under FILES_DIR (only when the run is applied — a preview writes nothing to disk),
 * the document code kept, the step it settled named the new way (`CODE#<container>` for a box).
 */
import { randomUUID } from "node:crypto";
import { isNull } from "drizzle-orm";
import { boxPosition } from "../../src/domain/legacy-activities";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { mapLegacyFile } from "../../src/domain/legacy-files";
import type { DbOrTx } from "../../src/server/db/client";
import { bookingFiles, bookings, containers, legacyLinks } from "../../src/server/db/schema";
import { storeFile } from "../../src/server/files";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

export async function importFiles(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
  write: boolean,
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "FILES");
  const [bs, boxes] = await Promise.all([
    tx.select({ id: bookings.id, ref: bookings.ref }).from(bookings),
    tx
      .select({
        id: containers.id,
        bookingId: containers.bookingId,
        number: containers.number,
        position: containers.position,
      })
      .from(containers)
      .where(isNull(containers.archivedAt)),
  ]);
  const boxOf = (bookingId: string, label: string) => {
    const mine = boxes.filter((b) => b.bookingId === bookingId);
    const at = boxPosition(label);
    return (
      mine.find((b) => b.number === label.toUpperCase().replace(/[\s-]/g, "")) ??
      (at === null ? undefined : mine.find((b) => b.position === at))
    )?.id;
  };
  for (const rec of records.filter((r) => r.kind === "FILES")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const f = mapLegacyFile(rec.body);
    if ("skip" in f) {
      report.skipped.push(`file ${rec.id}: ${f.skip}`);
      continue;
    }
    const bytes = new Uint8Array(Buffer.from(f.base64, "base64"));
    let first: string | null = null;
    for (const l of f.links) {
      const booking = bs.find((b) => b.ref === l.ref);
      if (!booking) {
        report.warnings.push(`${f.name}: booking ${l.ref} was not imported — not filed there`);
        continue;
      }
      const containerId = l.box ? (boxOf(booking.id, l.box) ?? null) : null;
      if (l.box && !containerId)
        report.warnings.push(`${f.name}: box "${l.box}" not found on ${l.ref}`);
      const storedName = `${randomUUID()}${f.ext}`;
      if (write) await storeFile(booking.id, storedName, bytes);
      const [row] = await tx
        .insert(bookingFiles)
        .values({
          bookingId: booking.id,
          containerId,
          name: f.name,
          storedName,
          mime: f.mime,
          sizeBytes: bytes.byteLength,
          code: l.code,
          stage: l.draft ? "draft" : "final",
          ruleCode: l.code ? (containerId ? `${l.code}#${containerId}` : l.code) : null,
          note: "Carried from the legacy office",
        })
        .returning({ id: bookingFiles.id });
      first ??= row.id;
    }
    if (!first) {
      report.skipped.push(`${f.name}: none of its bookings was imported`);
      continue;
    }
    report.added++;
    await tx.insert(legacyLinks).values({ kind: "FILES", legacyId: rec.id, recordId: first });
    links.set(rec.id, first);
  }
  return report;
}

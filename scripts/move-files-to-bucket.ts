/**
 * Copies every file of the system — bookings', messages', invoices' and contacts' — from
 * FILES_DIR into the bucket (OVH Object Storage), for the files kept before the bucket was
 * configured. Idempotent: a file already in the bucket is skipped. Each copy is read back and
 * compared byte for byte; the disk copy is left in place (nothing is deleted), so the app
 * reads the bucket first and the disk only as before.
 *   npm run files:to-bucket            → copy
 *   npm run files:to-bucket -- --dry   → only say what would be copied
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import type { FileOwner } from "../src/server/files";

config({ path: ".env.local", quiet: true });

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

type Row = { ownerId: string; storedName: string; name: string };
type Tally = { copied: number; already: number; missing: number; failed: number };

/** Every file table, keyed by the owner folder it is stored under. */
async function rowsOf(owner: FileOwner): Promise<Row[]> {
  const { db } = await import("../src/server/db/client");
  const s = await import("../src/server/db/schema");
  switch (owner) {
    case "bookings":
      return db
        .select({
          ownerId: s.bookingFiles.bookingId,
          storedName: s.bookingFiles.storedName,
          name: s.bookingFiles.name,
        })
        .from(s.bookingFiles);
    case "messages":
      return db
        .select({
          ownerId: s.messageFiles.messageId,
          storedName: s.messageFiles.storedName,
          name: s.messageFiles.name,
        })
        .from(s.messageFiles);
    case "invoices":
      return db
        .select({
          ownerId: s.invoiceFiles.invoiceId,
          storedName: s.invoiceFiles.storedName,
          name: s.invoiceFiles.name,
        })
        .from(s.invoiceFiles);
    case "contacts":
      return db
        .select({
          ownerId: s.contactFiles.contactId,
          storedName: s.contactFiles.storedName,
          name: s.contactFiles.name,
        })
        .from(s.contactFiles);
  }
}

async function moveOne(owner: FileOwner, f: Row, dry: boolean, tally: Tally) {
  const { storedPath } = await import("../src/server/files");
  const { getObject, putObject } = await import("../src/server/object-store");
  const key = `${owner}/${f.ownerId}/${f.storedName}`;
  const existing = await getObject(key);
  if (existing) {
    await existing.cancel();
    tally.already++;
    return;
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await readFile(storedPath(f.ownerId, f.storedName, owner)));
  } catch {
    console.warn(`missing on disk: ${key} (${f.name})`);
    tally.missing++;
    return;
  }
  if (dry) {
    console.log(`would copy ${key} (${f.name}, ${bytes.length} bytes)`);
    tally.copied++;
    return;
  }
  await putObject(key, bytes);
  const back = await getObject(key);
  const copy = back ? new Uint8Array(await new Response(back).arrayBuffer()) : null;
  if (!copy || sha(copy) !== sha(bytes)) {
    console.error(`NOT VERIFIED: ${key} (${f.name})`);
    tally.failed++;
    return;
  }
  console.log(`copied ${key} (${f.name}, ${bytes.length} bytes)`);
  tally.copied++;
}

async function main() {
  const dry = process.argv.includes("--dry");
  const { FILE_OWNERS } = await import("../src/server/files");
  const { hasBucket } = await import("../src/server/object-store");
  if (!hasBucket()) throw new Error("No bucket: set S3_ENDPOINT, S3_BUCKET and the S3 keys");

  let failed = 0;
  for (const owner of FILE_OWNERS) {
    const rows = await rowsOf(owner);
    const tally: Tally = { copied: 0, already: 0, missing: 0, failed: 0 };
    for (const f of rows) await moveOne(owner, f, dry, tally);
    console.log(
      `${rows.length} ${owner} files: ${tally.copied} ${dry ? "to copy" : "copied"}, ` +
        `${tally.already} already in the bucket, ${tally.missing} missing on disk, ${tally.failed} failed`,
    );
    failed += tally.failed;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Copies the papers kept on contacts from FILES_DIR into the bucket (OVH Object Storage), for
 * the files kept before the bucket was configured. Idempotent: a file already in the bucket
 * is skipped. Each copy is read back and compared byte for byte; the disk copy is left in
 * place (nothing is deleted), so the app reads the bucket first and the disk only as before.
 *   npm run files:to-bucket            → copy
 *   npm run files:to-bucket -- --dry   → only say what would be copied
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function main() {
  const dry = process.argv.includes("--dry");
  const { db } = await import("../src/server/db/client");
  const { contactFiles } = await import("../src/server/db/schema");
  const { storedPath } = await import("../src/server/files");
  const { getObject, hasBucket, putObject } = await import("../src/server/object-store");
  if (!hasBucket()) throw new Error("No bucket: set S3_ENDPOINT, S3_BUCKET and the S3 keys");

  const rows = await db
    .select({
      id: contactFiles.id,
      contactId: contactFiles.contactId,
      storedName: contactFiles.storedName,
      name: contactFiles.name,
    })
    .from(contactFiles);
  const tally = { copied: 0, already: 0, missing: 0, failed: 0 };

  for (const f of rows) {
    const key = `contacts/${f.contactId}/${f.storedName}`;
    const existing = await getObject(key);
    if (existing) {
      await existing.cancel();
      tally.already++;
      continue;
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await readFile(storedPath(f.contactId, f.storedName, "contacts")));
    } catch {
      console.warn(`missing on disk: ${key} (${f.name})`);
      tally.missing++;
      continue;
    }
    if (dry) {
      console.log(`would copy ${key} (${f.name}, ${bytes.length} bytes)`);
      tally.copied++;
      continue;
    }
    await putObject(key, bytes);
    const back = await getObject(key);
    const copy = back ? new Uint8Array(await new Response(back).arrayBuffer()) : null;
    if (!copy || sha(copy) !== sha(bytes)) {
      console.error(`NOT VERIFIED: ${key} (${f.name})`);
      tally.failed++;
      continue;
    }
    console.log(`copied ${key} (${f.name}, ${bytes.length} bytes)`);
    tally.copied++;
  }
  console.log(
    `${rows.length} contact files: ${tally.copied} ${dry ? "to copy" : "copied"}, ` +
      `${tally.already} already in the bucket, ${tally.missing} missing on disk, ${tally.failed} failed`,
  );
  process.exit(tally.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

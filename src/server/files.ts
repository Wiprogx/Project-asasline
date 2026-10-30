import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { env } from "@/env";
import { getObject, hasBucket, putObject } from "./object-store";

/**
 * Where the office's files live: a folder on the server (`FILES_DIR`), one sub-folder per
 * booking, each file under a stored name the database gives it. The database holds the
 * metadata; the folder holds the bytes. Nothing here is ever deleted: a file taken off a
 * booking is archived in the database and its bytes stay where they are.
 *
 * Owners in IN_BUCKET go to the bucket instead when one is configured, under the same
 * `<owner>/<id>/<stored name>` key (one folder per contact); a file kept on disk before
 * the bucket is still read from disk.
 */
const root = () => resolve(env.FILES_DIR);

/** What a file hangs on: a booking's folder, a message's, an invoice's, or a contact's. */
export type FileOwner = "bookings" | "messages" | "invoices" | "contacts";

const IN_BUCKET: ReadonlySet<FileOwner> = new Set(["contacts"]);
const inBucket = (owner: FileOwner) => IN_BUCKET.has(owner) && hasBucket();

/** The absolute path of a stored file, refused if it would leave the files folder. */
export function storedPath(ownerId: string, storedName: string, owner: FileOwner = "bookings") {
  const p = resolve(join(root(), owner, ownerId, storedName));
  if (!p.startsWith(root() + sep)) throw new Error("A file path outside the files folder");
  return p;
}

/** The bucket key of a stored file; the same path check as on disk. */
function objectKey(ownerId: string, storedName: string, owner: FileOwner) {
  storedPath(ownerId, storedName, owner);
  return `${owner}/${ownerId}/${storedName}`;
}

export async function storeFile(
  ownerId: string,
  storedName: string,
  bytes: Uint8Array,
  owner: FileOwner = "bookings",
) {
  if (inBucket(owner)) {
    const key = objectKey(ownerId, storedName, owner);
    await putObject(key, bytes);
    return key;
  }
  const p = storedPath(ownerId, storedName, owner);
  await mkdir(join(root(), owner, ownerId), { recursive: true });
  await writeFile(p, bytes, { flag: "wx" });
  return p;
}

/** A web stream of the bytes, or null when the file is not on disk (moved, or a lost volume). */
export async function openStoredFile(
  ownerId: string,
  storedName: string,
  owner: FileOwner = "bookings",
) {
  if (inBucket(owner)) {
    const stream = await getObject(objectKey(ownerId, storedName, owner));
    if (stream) return stream;
  }
  const p = storedPath(ownerId, storedName, owner);
  try {
    const s = await stat(p);
    if (!s.isFile()) return null;
  } catch {
    return null;
  }
  return Readable.toWeb(createReadStream(p)) as ReadableStream<Uint8Array>;
}

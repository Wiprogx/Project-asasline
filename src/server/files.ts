import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { env } from "@/env";

/**
 * Where the office's files live: a folder on the server (`FILES_DIR`), one sub-folder per
 * booking, each file under a stored name the database gives it. The database holds the
 * metadata; the folder holds the bytes. Nothing here is ever deleted: a file taken off a
 * booking is archived in the database and its bytes stay where they are.
 */
const root = () => resolve(env.FILES_DIR);

/** The absolute path of a stored file, refused if it would leave the files folder. */
export function storedPath(bookingId: string, storedName: string): string {
  const p = resolve(join(root(), "bookings", bookingId, storedName));
  if (!p.startsWith(root() + sep)) throw new Error("A file path outside the files folder");
  return p;
}

export async function storeFile(bookingId: string, storedName: string, bytes: Uint8Array) {
  const p = storedPath(bookingId, storedName);
  await mkdir(join(root(), "bookings", bookingId), { recursive: true });
  await writeFile(p, bytes, { flag: "wx" });
  return p;
}

/** A web stream of the bytes, or null when the file is not on disk (moved, or a lost volume). */
export async function openStoredFile(bookingId: string, storedName: string) {
  const p = storedPath(bookingId, storedName);
  try {
    const s = await stat(p);
    if (!s.isFile()) return null;
  } catch {
    return null;
  }
  return Readable.toWeb(createReadStream(p)) as ReadableStream<Uint8Array>;
}

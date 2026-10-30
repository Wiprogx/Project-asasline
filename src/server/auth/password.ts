import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * bcrypt, as the PHP server used: existing `$2y$` hashes from the legacy users table verify
 * unchanged, so staff keep their passwords through the migration.
 */
export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash.replace(/^\$2y\$/, "$2b$"));

let dummy: Promise<string> | undefined;

/** Compare against a real hash when the email is unknown, so timing reveals nothing. */
export function burnPasswordCheck(plain: string): Promise<boolean> {
  dummy ??= hashPassword("no such account");
  return dummy.then((h) => bcrypt.compare(plain, h));
}

/** Letters and digits nobody misreads on a phone call (no 0/O, 1/l/I). */
const READABLE = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A temporary password an Admin can read out: three groups of four, e.g. "k7Qm-2xRt-9bWs". */
export function temporaryPassword(): string {
  const pick = () => READABLE[randomInt(READABLE.length)];
  return Array.from({ length: 3 }, () => Array.from({ length: 4 }, pick).join("")).join("-");
}

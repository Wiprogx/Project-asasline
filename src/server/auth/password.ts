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

import "server-only";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail } from "@/lib/action-result";
import { invalidateTags, tags } from "@/server/cache/cache";
import { invalidateCountries } from "@/server/countries";
import { ConflictError } from "@/server/versioned";

/** Postgres' unique violation, whether thrown as is or wrapped by Drizzle (its `cause`). */
const isUniqueViolation = (e: unknown): boolean =>
  typeof e === "object" &&
  e !== null &&
  (("code" in e && e.code === "23505") || ("cause" in e && isUniqueViolation(e.cause)));

/**
 * Runs a write of Settings › Countries; a refusal, a code already in the table or a colleague's
 * newer save is the answer. The pickers, the contacts' lists and the pages read it again.
 */
export async function settleGeo(
  message: string,
  write: () => Promise<string | void>,
): Promise<ActionResult> {
  try {
    const refused = await write();
    if (refused) return fail(refused);
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    if (isUniqueViolation(e)) return fail("This code is already in the table.");
    throw e;
  }
  await invalidateCountries();
  await invalidateTags(tags.contacts);
  revalidatePath("/settings/countries", "layout");
  return { ok: true, data: undefined, message };
}

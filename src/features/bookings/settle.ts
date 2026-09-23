import "server-only";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail } from "@/lib/action-result";
import { invalidateTags, tags } from "@/server/cache/cache";
import { ConflictError } from "@/server/versioned";

/**
 * After a booking write: drop the cached lists and stats, re-render the screens. Kept out of
 * the "use server" files on purpose — every export there is a public endpoint.
 */
export async function settle(id: string) {
  await invalidateTags(tags.bookings, tags.booking(id), tags.dashboard);
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`, "layout");
  revalidatePath("/");
}

/** A refusal the person can act on (not a crash): shown as the form's error. */
export class Refused extends Error {}

/** Runs a write; a stale version or a refusal becomes the form's error, anything else throws. */
export async function guarded(
  id: string,
  fn: () => Promise<void>,
  message: string,
): Promise<ActionResult> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ConflictError || e instanceof Refused) return fail(e.message);
    throw e;
  }
  await settle(id);
  return { ok: true, data: undefined, message };
}

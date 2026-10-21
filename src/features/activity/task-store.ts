import "server-only";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail } from "@/lib/action-result";
import { invalidateTags, tags } from "@/server/cache/cache";
import { ConflictError } from "@/server/versioned";

// Internal to the activity actions: they call these after their permission check.

/** A refusal the person can act on, as opposed to a conflict with a colleague. */
export class Refused extends Error {}

function refresh(linkKind: string | null, linkId: string | null) {
  revalidatePath("/activity", "layout");
  revalidatePath("/");
  if (linkKind === "booking" && linkId) revalidatePath(`/bookings/${linkId}`, "layout");
  if (linkKind === "quotation" && linkId) revalidatePath(`/quotations/${linkId}`, "layout");
  if (linkKind === "contact" && linkId) revalidatePath(`/contacts/${linkId}`, "layout");
}

/** Runs a task write; a stale version or a refusal becomes the form's error. */
export async function run(
  fn: () => Promise<{ linkKind: string | null; linkId: string | null }>,
  message: string,
): Promise<ActionResult> {
  try {
    const link = await fn();
    await invalidateTags(tags.dashboard); // the home panel counts the open steps
    refresh(link.linkKind, link.linkId);
    return { ok: true, data: undefined, message };
  } catch (e) {
    if (e instanceof ConflictError || e instanceof Refused) return fail(e.message);
    throw e;
  }
}

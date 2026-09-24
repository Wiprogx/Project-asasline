"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { quotationLines, quotations } from "@/server/db/schema";
import { publish } from "@/server/events";
import { ConflictError } from "@/server/versioned";
import { displaySchema, listedSchema, sendSchema } from "./editor-schemas";
import { editorResult, lineIn, Refused, touchQuotation } from "./editor-store";
import { recordSending } from "./send-store";

/** Itemized, or all-inclusive: the customer's document follows the choice. */
export async function setDisplay(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = displaySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, display } = parsed.data;
  return editorResult(quotationId, "Presentation changed", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      await tx.update(quotations).set({ display }).where(eq(quotations.id, quotationId));
    }),
  );
}

/** On an all-inclusive quotation: name this service on the document, or not. */
export async function toggleListed(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = listedSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { quotationId, version, lineId } = parsed.data;
  return editorResult(quotationId, "Saved", () =>
    db.transaction(async (tx) => {
      await touchQuotation(tx, quotationId, version, user.id);
      const { line } = await lineIn(tx, quotationId, lineId);
      await tx
        .update(quotationLines)
        .set({ listed: !line.listed })
        .where(eq(quotationLines.id, lineId));
    }),
  );
}

/**
 * Sending: recorded on the quotation (send-store), then nothing leaves by itself — the
 * person's own mail app or WhatsApp opens with the text they read (legacy composeQuote).
 */
export async function sendQuotation(
  _p: ActionResult<{ href: string }>,
  fd: FormData,
): Promise<ActionResult<{ href: string }>> {
  const user = await requirePermission("app.quotations");
  const parsed = sendSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  try {
    await db.transaction((tx) => recordSending(tx, d, user.id, officeToday()));
  } catch (e) {
    if (e instanceof ConflictError || e instanceof Refused) return fail(e.message);
    throw e;
  }
  await invalidateTags(tags.quotations);
  await publish({ type: "message", linkId: d.quotationId });
  revalidatePath(`/quotations/${d.quotationId}`);
  revalidatePath("/quotations");
  revalidatePath("/activity");
  const href =
    d.channel === "email"
      ? `mailto:${encodeURIComponent(d.toText)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`
      : `https://wa.me/${d.toText.replace(/\D/g, "")}?text=${encodeURIComponent(d.body)}`;
  return { ok: true, data: { href }, message: "Recorded as sent — opening it to send" };
}

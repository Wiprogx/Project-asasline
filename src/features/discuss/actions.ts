"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  CHANNELS_READ_BARE,
  keyOf,
  outwardProblem,
  refsInText,
  threadIdOf,
  withKey,
} from "@/domain/messages";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { messages } from "@/server/db/schema";
import { publish } from "@/server/events";
import { resolveRef } from "@/server/messaging";
import { claimSchema, logIncomingSchema, postInternalSchema, sendSchema } from "./schemas";

function refresh(linkId?: string | null) {
  revalidatePath("/discuss", "layout");
  if (linkId) revalidatePath(`/bookings/${linkId}`, "layout");
}

/** Internal chat. A bare SB/QT number in the text links the message to its record. */
export async function postInternal(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.discuss");
  const parsed = postInternalSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { room, body } = parsed.data;
  const link = await resolveRef(db, refsInText(body)[0]);
  await db.insert(messages).values({
    channel: "internal",
    direction: "internal",
    room,
    body,
    authorId: user.id,
    linkKind: link?.kind,
    linkId: link?.id,
    linkRef: link?.ref,
    createdBy: user.id,
  });
  await publish({ type: "message", room });
  refresh();
  return { ok: true, data: undefined, message: "Posted" };
}

/** A message that arrived another way, logged so it is routed, queued and kept on its file. */
export async function logIncoming(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.discuss");
  const parsed = logIncomingSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const bare = CHANNELS_READ_BARE.includes(d.channel)
    ? refsInText(`${d.subject ?? ""} ${d.body}`)[0]
    : undefined;
  // A reply carries our subject key: it links the message and puts it back on its thread.
  const key = keyOf(d.subject);
  const link = await resolveRef(db, d.linkRef ?? key?.ref ?? bare);
  if (d.linkRef && !link)
    return {
      ok: false,
      error: `No booking or quotation has the number ${d.linkRef}.`,
      fieldErrors: { linkRef: ["Unknown number"] },
    };

  const [row] = await db
    .insert(messages)
    .values({
      ...d,
      direction: "in",
      linkKind: link?.kind,
      linkId: link?.id,
      linkRef: link?.ref,
      threadId: threadIdOf(link?.ref ?? null, key?.code ?? d.topic),
      // A call someone answered is theirs already: nothing to claim.
      claimedBy: d.channel === "call" && d.callOutcome === "answered" ? user.id : null,
      claimedAt: d.channel === "call" && d.callOutcome === "answered" ? new Date() : null,
      authorId: user.id,
      createdBy: user.id,
    })
    .returning({ id: messages.id });
  await audit(db, { action: "message.in", userId: user.id, entity: "message", entityId: row.id });
  await publish({ type: "message", linkId: link?.id });
  refresh(link?.id);
  return { ok: true, data: undefined, message: "Logged" };
}

/**
 * Records an outgoing e-mail or WhatsApp with the subject key, and hands back the link that
 * opens it in the mail or WhatsApp app. Real sending comes with the mail server integration;
 * until then `deliveredAt` stays empty and the message says so.
 */
export async function sendMessage(
  _p: ActionResult<{ href: string }>,
  fd: FormData,
): Promise<ActionResult<{ href: string }>> {
  const user = await requirePermission("app.discuss");
  const parsed = sendSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const problem = outwardProblem(d.channel);
  if (problem) return fail(problem);
  const link = await resolveRef(db, d.linkRef);
  const subject = link ? withKey(d.subject, link.ref, d.code) : d.subject;

  const [row] = await db
    .insert(messages)
    .values({
      channel: d.channel,
      direction: "out",
      toText: d.toText,
      contactId: d.contactId,
      subject,
      body: d.body,
      linkKind: link?.kind,
      linkId: link?.id,
      linkRef: link?.ref,
      threadId: threadIdOf(link?.ref ?? null, d.code),
      replyToId: d.replyToId,
      authorId: user.id,
      createdBy: user.id,
    })
    .returning({ id: messages.id });
  await audit(db, { action: "message.out", userId: user.id, entity: "message", entityId: row.id });
  await publish({ type: "message", linkId: link?.id });
  refresh(link?.id);

  const href =
    d.channel === "email"
      ? `mailto:${encodeURIComponent(d.toText)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(d.body)}`
      : `https://wa.me/${d.toText.replace(/\D/g, "")}?text=${encodeURIComponent(d.body)}`;
  return { ok: true, data: { href }, message: "Recorded — opening it to send" };
}

/** First to open it takes it; a second person is told who already has it. */
export async function claimMessage(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.discuss");
  const parsed = claimSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const rows = await db
    .update(messages)
    .set({ claimedBy: user.id, claimedAt: new Date() })
    .where(and(eq(messages.id, parsed.data.id), isNull(messages.claimedBy)))
    .returning({ linkId: messages.linkId });
  if (rows.length === 0) return fail("Someone already took this one.");
  await publish({ type: "message", linkId: rows[0].linkId });
  refresh(rows[0].linkId);
  return { ok: true, data: undefined, message: "Yours now" };
}

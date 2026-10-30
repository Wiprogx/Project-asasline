"use server";

import { revalidatePath } from "next/cache";
import { signed } from "@/domain/templates";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { messages } from "@/server/db/schema";
import { deliver, outcomeOf } from "@/server/delivery";
import { signatureOf } from "@/server/messaging";
import { readContactPaper } from "./file-store";
import { sendContactFileSchema } from "./schemas";

/**
 * Sends one paper of the contact's file by e-mail, with the office's signature. The letter is
 * recorded on the contact's messages first; without a mail server it opens in the person's own
 * mail app instead (a mailto cannot carry the file: they attach it there).
 */
export async function sendContactFile(
  _p: ActionResult<{ href: string }>,
  fd: FormData,
): Promise<ActionResult<{ href: string }>> {
  const user = await requirePermission("app.contacts");
  const parsed = sendContactFileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const paper = await readContactPaper(d.contactId, d.where, d.fileId);
  if (!paper) return fail("This file is no longer on the contact's file.");
  const body = signed(d.body, await signatureOf(user.name));

  const [row] = await db
    .insert(messages)
    .values({
      channel: "email",
      direction: "out",
      toText: d.to,
      cc: d.cc,
      contactId: d.contactId,
      subject: d.subject,
      body,
      authorId: user.id,
      createdBy: user.id,
    })
    .returning({ id: messages.id });
  await audit(db, {
    action: "contact.file.send",
    userId: user.id,
    entity: "contact",
    entityId: d.contactId,
    detail: { message: row.id, file: d.fileId, where: d.where, name: paper.name, to: d.to },
  });
  const letter = {
    channel: "email" as const,
    to: d.to,
    cc: d.cc,
    subject: d.subject,
    body,
    attachments: [{ filename: paper.name, content: paper.bytes, contentType: paper.mime }],
  };
  const sent = await deliver(db, row.id, letter);
  const out = outcomeOf(sent, letter, "Recorded");
  revalidatePath(`/contacts/${d.contactId}`, "layout");
  const handOff = sent.sent ? "" : ` · attach ${paper.name} there`;
  return { ok: true, data: { href: out.href ?? "" }, message: out.message + handOff };
}

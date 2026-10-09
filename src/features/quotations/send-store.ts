import "server-only";
import { eq } from "drizzle-orm";
import { threadIdOf } from "@/domain/messages";
import { audit } from "@/server/audit";
import type { Tx } from "@/server/db/client";
import { contacts, messages, quotations } from "@/server/db/schema";
import type { sendSchema } from "./editor-schemas";
import { Refused, touchQuotation } from "./editor-store";
import { openAutoTask } from "@/server/auto-tasks";

// Internal: the send action calls this after its permission check.

type Letter = ReturnType<typeof sendSchema.parse>;

/**
 * Records a quotation as sent: the letter on its messages, a draft becomes "sent" with the day
 * and the channel, and a task for tomorrow asks whether the customer agrees.
 */
export async function recordSending(tx: Tx, d: Letter, userId: string, today: string) {
  const q = await touchQuotation(tx, d.quotationId, d.version, userId);
  if (q.status === "declined") throw new Refused("The customer declined this quotation.");
  const [client] = await tx
    .select({ name: contacts.name })
    .from(contacts)
    .where(eq(contacts.id, q.clientId));
  await tx
    .update(quotations)
    .set({ status: q.status === "draft" ? "sent" : q.status, sentOn: today, sentVia: d.channel })
    .where(eq(quotations.id, q.id));
  const [msg] = await tx
    .insert(messages)
    .values({
      channel: d.channel,
      direction: "out",
      toText: d.toText,
      contactId: q.clientId,
      subject: d.subject,
      body: d.body,
      linkKind: "quotation",
      linkId: q.id,
      linkRef: q.ref,
      threadId: threadIdOf(q.ref),
      authorId: userId,
      createdBy: userId,
    })
    .returning({ id: messages.id });
  // The follow-up the rule "Quotation sent" asks for (Settings › Automatic activities).
  await openAutoTask(tx, {
    trigger: "quote_sent",
    vars: { ref: q.ref, client: client?.name ?? "the customer" },
    link: { kind: "quotation", id: q.id },
    userId,
    today,
  });
  await audit(tx, {
    action: "quotation.send",
    userId,
    entity: "quotation",
    entityId: q.id,
    detail: { channel: d.channel, to: d.toText },
  });
  return msg.id;
}

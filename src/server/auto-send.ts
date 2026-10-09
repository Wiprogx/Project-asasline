import "server-only";
import { and, eq } from "drizzle-orm";
import { autoChannelFor } from "@/domain/channels";
import { threadIdOf, withKey } from "@/domain/messages";
import { fillTemplate, signed } from "@/domain/templates";
import { audit } from "./audit";
import { readAutoSend } from "./channel-config";
import type { DbOrTx } from "./db/client";
import { bookings, contacts, messages } from "./db/schema";
import { deliver } from "./delivery";
import { publish } from "./events";
import { bookingVars } from "./letters";
import { readTemplates, signatureOf } from "./messaging";

/**
 * A tracking milestone's news goes to the customer by itself (legacy autoSend): the template
 * the journey step names, filled from the file, recorded on the booking as sent automatically,
 * once only, on the channel Settings allows and the customer has. Returns what went, or null.
 */
export async function autoSend(
  tx: DbOrTx,
  o: { bookingId: string; code: string; userId: string; me: string },
): Promise<{ code: string; channel: "email" | "whatsapp" } | null> {
  const setting = await readAutoSend();
  if (!setting.enabled) return null;
  const tpl = (await readTemplates()).find((t) => t.code === o.code && t.active);
  if (!tpl) return null;
  const [row] = await tx
    .select({
      ref: bookings.ref,
      cc: bookings.cc,
      clientId: bookings.clientId,
      email: contacts.email,
      whatsapp: contacts.whatsapp,
      mobile: contacts.mobile,
    })
    .from(bookings)
    .leftJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(eq(bookings.id, o.bookingId));
  if (!row) return null;
  const channel = autoChannelFor(setting, {
    email: row.email,
    whatsapp: row.whatsapp ?? row.mobile,
  });
  if (!channel) return null;
  const threadId = threadIdOf(row.ref, o.code);
  // Once only (legacy): the same news is never sent twice for one booking.
  const [already] = await tx
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.linkId, o.bookingId),
        eq(messages.threadId, threadId ?? ""),
        eq(messages.auto, true),
      ),
    )
    .limit(1);
  if (already) return null;
  const vars = await bookingVars(tx, o.bookingId, o.me);
  if (!vars) return null;
  const to = (channel === "email" ? row.email : (row.whatsapp ?? row.mobile)) ?? "";
  const subject = withKey(fillTemplate(tpl.subject, vars), row.ref, o.code);
  const body = signed(fillTemplate(tpl.body, vars), await signatureOf(o.me));
  const cc = channel === "email" ? row.cc : [];
  const [m] = await tx
    .insert(messages)
    .values({
      channel,
      direction: "out",
      toText: to,
      cc,
      contactId: row.clientId,
      subject,
      body,
      linkKind: "booking",
      linkId: o.bookingId,
      linkRef: row.ref,
      threadId,
      authorId: o.userId,
      createdBy: o.userId,
      auto: true,
    })
    .returning({ id: messages.id });
  await audit(tx, {
    action: "message.auto",
    userId: o.userId,
    entity: "booking",
    entityId: o.bookingId,
    detail: { code: o.code, channel, to },
  });
  await deliver(tx, m.id, { channel, to, cc, subject, body });
  await publish({ type: "message", linkId: o.bookingId });
  return { code: o.code, channel };
}

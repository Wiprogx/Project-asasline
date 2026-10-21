/**
 * Answering a message in place (legacy replyTo): the same channel when it came by WhatsApp,
 * e-mail otherwise; back to the sender, the contact's own address first; the subject "Re: …".
 */
import { replySubject } from "./messages";

export type ReplyDraft = {
  replyToId: string;
  channel: "email" | "whatsapp";
  subject: string;
  to: string;
  contactId: string | null;
};

export function replyDraft(m: {
  id: string;
  channel: string;
  subject: string | null;
  fromText: string | null;
  contactId: string | null;
  contactEmail: string | null;
  contactWhatsapp: string | null;
}): ReplyDraft {
  const channel = m.channel === "whatsapp" ? "whatsapp" : "email";
  const own = channel === "whatsapp" ? m.contactWhatsapp : m.contactEmail;
  return {
    replyToId: m.id,
    channel,
    subject: m.subject ? replySubject(m.subject) : "",
    to: own ?? m.fromText ?? "",
    contactId: m.contactId,
  };
}

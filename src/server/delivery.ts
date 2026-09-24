import "server-only";
import { eq } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";
import type { DbOrTx } from "./db/client";
import { messages } from "./db/schema";

export type Outgoing = {
  channel: "email" | "whatsapp";
  to: string;
  subject: string;
  body: string;
};

export type Delivery =
  | { sent: true; id: string | null }
  | { sent: false; why: "not configured" | "refused"; detail?: string };

let transport: Transporter | null = null;
const mailer = () => (transport ??= nodemailer.createTransport(env.SMTP_URL));

/** The link that opens the letter in the person's own mail app or WhatsApp (the fallback). */
export function handOffLink(m: Outgoing): string {
  return m.channel === "email"
    ? `mailto:${encodeURIComponent(m.to)}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`
    : `https://wa.me/${m.to.replace(/\D/g, "")}?text=${encodeURIComponent(m.body)}`;
}

/** Whether the server can send on that channel itself (env-configured), or must hand off. */
export const configured = (channel: Outgoing["channel"]) =>
  channel === "email" ? !!env.SMTP_URL : !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID);

async function sendMail(m: Outgoing): Promise<Delivery> {
  try {
    const info = await mailer().sendMail({
      from: env.MAIL_FROM ?? "noreply@asasline.com",
      to: m.to,
      subject: m.subject,
      text: m.body,
    });
    return { sent: true, id: info.messageId ?? null };
  } catch (e) {
    return { sent: false, why: "refused", detail: e instanceof Error ? e.message : String(e) };
  }
}

/** WhatsApp Business Cloud API: a text message to a number, free-form within the 24 h window. */
async function sendWhatsApp(m: Outgoing): Promise<Delivery> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: m.to.replace(/\D/g, ""),
      type: "text",
      text: { body: m.body },
    }),
  }).catch((e: unknown) => e);
  if (!(res instanceof Response))
    return { sent: false, why: "refused", detail: res instanceof Error ? res.message : "network" };
  if (!res.ok) return { sent: false, why: "refused", detail: `HTTP ${res.status}` };
  const json = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
  return { sent: true, id: json.messages?.[0]?.id ?? null };
}

/**
 * Sends a recorded message where the server is configured to, and marks it delivered; where
 * it is not, nothing leaves by itself and the caller hands the letter to the person's own app.
 * A refusal by the server is reported, never swallowed: the record stays "not sent yet".
 */
export async function deliver(tx: DbOrTx, messageId: string, m: Outgoing): Promise<Delivery> {
  if (!configured(m.channel)) return { sent: false, why: "not configured" };
  const result = m.channel === "email" ? await sendMail(m) : await sendWhatsApp(m);
  if (result.sent)
    await tx.update(messages).set({ deliveredAt: new Date() }).where(eq(messages.id, messageId));
  return result;
}

/** What the person is told, and whether their own app must open (`href`) to send it. */
export function outcomeOf(
  d: Delivery,
  m: Outgoing,
  recorded: string,
): { message: string; href?: string } {
  if (d.sent) return { message: `Sent by ${m.channel === "email" ? "e-mail" : "WhatsApp"}` };
  if (d.why === "refused")
    return {
      message: `${recorded} — the server refused it (${d.detail ?? "no detail"}); opening it to send by hand`,
      href: handOffLink(m),
    };
  return { message: `${recorded} — opening it to send`, href: handOffLink(m) };
}

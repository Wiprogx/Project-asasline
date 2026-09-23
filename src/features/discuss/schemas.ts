import { z } from "zod";
import { CALL_OUTCOMES, OFFICE_CHANNEL } from "@/domain/messages";
import { ROLES } from "@/domain/permissions";

/** Internal chat rooms: the whole office, and one per role (generated, never typed). */
export const ROOMS = [OFFICE_CHANNEL, ...ROLES] as const;

const ref = z
  .string()
  .regex(/^(SB|QT)\d{7,}$/i, "An SB or QT number")
  .transform((s) => s.toUpperCase())
  .optional();

export const postInternalSchema = z.object({
  room: z.enum(ROOMS),
  body: z.string().min(1, "Write something").max(5000),
});

/** A message that came in by another way (mail client, phone, WhatsApp) — logged here. */
export const logIncomingSchema = z.object({
  channel: z.enum(["email", "whatsapp", "call", "web"]),
  fromText: z.string().min(1, "Who sent it?").max(200),
  contactId: z.uuid().optional(),
  subject: z.string().max(300).optional(),
  body: z.string().max(10_000).default(""),
  linkRef: ref,
  topic: z.string().max(30).optional(),
  callSeconds: z.coerce.number().int().min(0).max(36_000).optional(),
  callOutcome: z.enum(CALL_OUTCOMES).optional(),
});

/** An outgoing e-mail or WhatsApp: recorded with its subject key, opened in the mail app. */
export const sendSchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  toText: z.string().min(3, "E-mail address or phone number").max(200),
  contactId: z.uuid().optional(),
  subject: z.string().max(300).default(""),
  body: z.string().min(1, "Write the message").max(10_000),
  linkRef: ref,
  code: z
    .string()
    .regex(/^[A-Z0-9_]{2,20}$/)
    .optional(),
  replyToId: z.uuid().optional(),
});

export const claimSchema = z.object({ id: z.uuid() });

import type { Role } from "./permissions";

/**
 * One message store for every channel (legacy MESSAGES): e-mail, WhatsApp, internal chat,
 * calls and the website are all messages — a call is a message with a duration, an internal
 * note a message with a channel. No second store.
 */
export const CHANNELS = ["email", "whatsapp", "internal", "call", "web"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  internal: "Internal",
  call: "Call",
  web: "Website",
};

export const DIRECTIONS = ["in", "out", "internal"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const CALL_OUTCOMES = ["answered", "missed", "voicemail"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

// ---- The subject key: [SB2609001/INVOICE] — our reference, and what it is about ----

const KEY = /\[((?:SB|QT)\d{7,})\/([A-Z0-9_]+)\]/;
const REF = /\b((?:SB|QT)\d{7,})\b/g;

export function subjectKey(ref: string, code = "MSG"): string {
  return `[${ref}/${code}]`;
}

export function keyOf(subject: string | null | undefined): { ref: string; code: string } | null {
  const m = KEY.exec(subject ?? "");
  return m ? { ref: m[1], code: m[2] } : null;
}

/** Stamps the key on a subject once; a reply keeps it, so it comes back to the same thread. */
export function withKey(subject: string, ref: string, code?: string): string {
  return keyOf(subject) ? subject : `${subjectKey(ref, code)} ${subject}`.trim();
}

export const replySubject = (s: string) => (/^re:/i.test(s) ? s : `Re: ${s}`);

/** One thread per record and subject key. */
export const threadIdOf = (ref: string | null, code?: string | null) =>
  ref ? `${ref}/${code || "MSG"}` : null;

/**
 * Bare references in the office's own writing ("SB2609001 vgm 31200 kgs"). Read only where
 * the writing is ours — internal chat, a call note, the website; an e-mail from outside keeps
 * needing its key, because a customer quoting a number in a sentence is not filing.
 */
export const CHANNELS_READ_BARE: readonly Channel[] = ["internal", "call", "web"];

export function refsInText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.toUpperCase().matchAll(REF)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

// ---- Routing: what a message is about decides which ROLE it goes to (legacy ROUTING) ----

export type Route = { code: string; subject: string; role: Role; active: boolean };

export const DEFAULT_ROUTES: Route[] = [
  { code: "SHIPMENT", subject: "A shipment already booked", role: "docs_clerk", active: true },
  { code: "QUOTE", subject: "A price we already quoted", role: "docs_clerk", active: true },
  { code: "INVOICE", subject: "An invoice or a payment", role: "accountant", active: true },
  { code: "NEWRATE", subject: "A price for a new shipment", role: "team_lead", active: true },
  { code: "OTHER", subject: "Something else", role: "team_lead", active: true },
];
export const ROUTE_FALLBACK = "OTHER";

/**
 * What a message is about: the topic the sender picked, else the record it is attached to,
 * else the key in its subject. Nothing is guessed from prose.
 */
export function routeCodeOf(
  m: { topic?: string | null; linkRef?: string | null; subject?: string | null },
  routes: readonly Route[],
): string {
  if (m.topic && routes.some((r) => r.code === m.topic && r.active)) return m.topic;
  const key = keyOf(m.subject);
  if (key && routes.some((r) => r.code === key.code && r.active)) return key.code;
  const ref = m.linkRef ?? key?.ref ?? "";
  if (ref.startsWith("SB")) return "SHIPMENT";
  if (ref.startsWith("QT")) return "QUOTE";
  return ROUTE_FALLBACK;
}

/** The role stored for a route — resolved to a person only when someone opens the queue. */
export function routeRole(code: string, routes: readonly Route[]): Role {
  const hit =
    routes.find((r) => r.code === code && r.active) ??
    routes.find((r) => r.code === ROUTE_FALLBACK && r.active) ??
    routes.at(-1);
  return hit?.role ?? "team_lead";
}

/**
 * Waiting = genuinely unanswered: it came from outside, nobody took it, and nothing went back
 * on its thread since. A queue that counts every message ever received is noise.
 */
export function isWaiting(m: {
  direction: Direction;
  claimedBy: string | null;
  channel: Channel;
  callOutcome: CallOutcome | null;
  answeredLater: boolean;
}): boolean {
  if (m.direction !== "in" || m.claimedBy || m.answeredLater) return false;
  return !(m.channel === "call" && m.callOutcome === "answered");
}

/** Internal messages never leave the office (invariant 8). */
export function outwardProblem(channel: Channel): string | null {
  return channel === "internal" ? "An internal message cannot be sent outside the office." : null;
}

/** Internal chat channels: one per role, plus the whole office. Generated, so no typo'd queue. */
export const OFFICE_CHANNEL = "office";

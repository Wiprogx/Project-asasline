/**
 * A legacy message (legacy logMsg: at, by, dir, ch, to, subject, body, link, code, threadId,
 * replyTo, chan, topic, secs, outcome, claimedBy, escalated) as the new message. People are
 * named, the import finds them; times stay as the office wrote them, "YYYY-MM-DD HH:MM" in
 * the office's time zone. A message that went out is taken as delivered — it left the legacy
 * office one way or another.
 */
import { CALL_OUTCOMES, type CallOutcome, type Channel, type Direction } from "./messages";

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const stamp = (v: unknown) => {
  const s = typeof v === "string" ? v.trim().replace("T", " ") : "";
  return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?/.test(s) ? s.slice(0, 16) : null;
};

const CHANNEL: Record<string, Channel> = {
  email: "email",
  both: "email",
  whatsapp: "whatsapp",
  internal: "internal",
  call: "call",
  web: "web",
};

export function mapLegacyMessage(m: Record<string, unknown>) {
  const at = stamp(m.at);
  if (!at) return { skip: "no time" };
  const channel = CHANNEL[String(m.ch)] ?? "email";
  const direction: Direction = channel === "internal" ? "internal" : m.dir === "in" ? "in" : "out";
  const outcome = (CALL_OUTCOMES as readonly string[]).includes(String(m.outcome))
    ? (m.outcome as CallOutcome)
    : null;
  const files = Array.isArray(m.files) ? m.files.length : 0;
  const counterpart = text(m.to);
  return {
    at,
    message: {
      channel,
      direction,
      room: text(m.chan),
      fromText: direction === "in" ? counterpart : null,
      toText: direction === "out" ? counterpart : null,
      cc: Array.isArray(m.cc) ? m.cc.filter((c): c is string => typeof c === "string") : [],
      subject: text(m.subject),
      body: typeof m.body === "string" ? m.body : "",
      linkRef: text(m.link),
      topic: text(m.topic),
      threadId: text(m.threadId),
      callSeconds: Number(m.secs) > 0 ? Math.round(Number(m.secs)) : null,
      callOutcome: outcome,
      auto: m.auto === true,
    },
    people: {
      author: direction === "in" ? null : text(m.by),
      claimedBy: text(m.claimedBy) ?? text(m.answeredBy),
      claimedAt: stamp(m.claimedAt),
    },
    delivered: direction === "out",
    escalated: m.escalated === true,
    legacyReplyTo: m.replyTo === undefined || m.replyTo === null ? null : String(m.replyTo),
    warnings: files ? [`${files} attached file(s) not carried by this step`] : [],
  };
}

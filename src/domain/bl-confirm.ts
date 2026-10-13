/**
 * The B/L confirmation (legacy blConfirm): the draft went to the forwarder at destination and
 * one of two answers came back — confirmed as it is, or a correction is wanted. The channel
 * matters: a correction changes a banking document, so it may not be agreed on a phone call
 * with nothing to show.
 */
export const BL_STEP = "BL_OK";

export const BL_OUTCOMES = ["ok", "fix"] as const;
export type BlOutcome = (typeof BL_OUTCOMES)[number];

export const BL_CHANNELS = [
  { key: "call", label: "Phone call", copy: false },
  { key: "whatsapp", label: "WhatsApp", copy: true },
  { key: "email", label: "Email", copy: true },
] as const;
export type BlChannel = (typeof BL_CHANNELS)[number]["key"];

/** Why the answer cannot be recorded as given, or null. */
export function blProblem(outcome: BlOutcome, channel: BlChannel, text: string): string | null {
  if (outcome === "fix" && channel === "call")
    return "A correction needs WhatsApp or email — we must keep the wording.";
  if (outcome === "fix" && !text.trim()) return "Write down what has to change.";
  return null;
}

/** The word kept on the step: how it was confirmed, or what has to change. */
export function blNote(outcome: BlOutcome, channel: BlChannel, text: string): string {
  const c = BL_CHANNELS.find((x) => x.key === channel)!;
  return outcome === "ok"
    ? `confirmed by ${c.label}${c.copy ? " — copy kept" : ""}`
    : `correction wanted: ${text.trim()}`;
}

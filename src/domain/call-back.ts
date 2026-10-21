/**
 * A missed call is work (legacy 7.5): it becomes a task with an owner and a day — the role the
 * routing table gives its topic, today — not a red counter. An answered one is done.
 */
import type { CallOutcome } from "./messages";

export const needsCallBack = (channel: string, outcome: CallOutcome | null | undefined) =>
  channel === "call" && (outcome === "missed" || outcome === "voicemail");

export const callBackTitle = (from: string, ref: string | null | undefined) =>
  `Call back ${from}${ref ? ` about ${ref}` : ""}`;

/** Minutes typed on the call log, as the seconds the message keeps. */
export const callSecondsOf = (minutes: number | undefined) =>
  minutes === undefined ? undefined : Math.round(minutes * 60);

import type { DocRule } from "./engine";

/**
 * What closes a step without a hand on it (legacy need "send" with its tpl, need "track"):
 * a message that went out from the booking with the rule's template, or a milestone of the
 * journey ticked. Both read the rule book, so a new rule closes the same way (invariant 8).
 */

/** The steps a message with this template code closes: the rule's template, or its own code when none is named. */
export const sentSteps = (rules: readonly DocRule[], templateCode: string): string[] =>
  rules
    .filter((r) => r.active && r.need === "send" && (r.tpl ?? r.code) === templateCode)
    .map((r) => r.code);

/** The steps a journey milestone closes: the rules that name it. */
export const trackedSteps = (rules: readonly DocRule[], milestone: string): string[] =>
  rules.filter((r) => r.active && r.need === "track" && r.event === milestone).map((r) => r.code);

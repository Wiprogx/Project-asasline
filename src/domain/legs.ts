/**
 * A booking may ride several vessels (legacy legs[]): the main sailing, then onward legs via a
 * transhipment port. The first sailing sets the cut-offs; the last one decides the arrival the
 * customer is told — never the transhipment port's date.
 */
export type Leg = { position: number; name: string; voyage: string; eta: string | null };

/** The arrival that matters: the last leg's, else the main sailing's (legacy finalVessel). */
export function arrivalOf(mainEta: string | null, legs: readonly { eta: string | null }[]) {
  for (let i = legs.length - 1; i >= 0; i--) if (legs[i].eta) return legs[i].eta;
  return legs.length ? (legs[legs.length - 1]?.eta ?? mainEta) : mainEta;
}

/** "MSC ROMA FA534A → MAERSK SELETAR 112W" — the routing in one line; empty without legs. */
export const routingLabel = (
  main: { name: string | null; voyage: string | null } | null,
  legs: readonly Leg[],
) =>
  legs.length === 0
    ? ""
    : [main ? `${main.name ?? "?"} ${main.voyage ?? ""}`.trim() : "?"]
        .concat(legs.map((l) => `${l.name} ${l.voyage}`.trim()))
        .join(" → ");

/** An onward leg must be a different sailing from the main one and from the legs already on. */
export function legProblem(
  vesselId: string,
  mainVesselId: string | null,
  legs: readonly { vesselId: string }[],
): string | null {
  if (!mainVesselId) return "Set the main sailing first; the legs follow it.";
  if (vesselId === mainVesselId) return "That is the main sailing; pick the connecting one.";
  if (legs.some((l) => l.vesselId === vesselId)) return "That sailing is already a leg.";
  return null;
}

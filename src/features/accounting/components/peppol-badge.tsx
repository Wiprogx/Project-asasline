import { ToneBadge } from "@/components/shared/tone-badge";
import { PEPPOL_STATE_LABEL, type PeppolState } from "@/domain/peppol";
import type { Tone } from "@/domain/shipments";

const TONE: Record<PeppolState, Tone> = {
  received: "info",
  sent: "success",
  ready: "neutral",
  blocked: "warning",
};

/** Where the document stands with Peppol, with the day it was sent. */
export function PeppolBadge({
  state,
  sentOn,
}: {
  state: PeppolState | null;
  sentOn?: string | null;
}) {
  if (!state) return null;
  return (
    <ToneBadge tone={TONE[state]}>
      {PEPPOL_STATE_LABEL[state]}
      {state === "sent" && sentOn ? ` · ${sentOn}` : ""}
    </ToneBadge>
  );
}

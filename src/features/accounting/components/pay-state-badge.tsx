import { ToneBadge } from "@/components/shared/tone-badge";
import { PAY_STATE_META, type PayState } from "@/domain/payments";

export function PayStateBadge({ state }: { state: PayState }) {
  const m = PAY_STATE_META[state];
  return <ToneBadge tone={m.tone}>{m.label}</ToneBadge>;
}

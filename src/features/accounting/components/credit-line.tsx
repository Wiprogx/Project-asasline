import { ToneBadge } from "@/components/shared/tone-badge";
import { formatCents } from "@/domain/money";

/** What the customer owes or will be invoiced, against their credit limit. */
export function CreditLine({
  limitCents,
  exposureCents,
  problem,
}: {
  limitCents: number | null;
  exposureCents: number;
  problem: string | null;
}) {
  return (
    <p className="flex flex-wrap items-center gap-2 pb-4 text-sm text-muted-foreground">
      Owed or to invoice:{" "}
      <span className="text-foreground tabular-nums">{formatCents(exposureCents)}</span>
      {limitCents ? <> · credit limit {formatCents(limitCents)}</> : " · no credit limit"}
      {problem && <ToneBadge tone="danger">Over the credit limit</ToneBadge>}
    </p>
  );
}

"use client";

import { ActionForm } from "@/components/shared/action-form";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/domain/money";
import { useToastedAction } from "@/hooks/use-action-toast";
import { bookAccruals, cancelAccruals } from "../accrual-actions";

/** Books what the table shows on the chosen day. */
export function BookAccruals({ onDate, totalCents }: { onDate: string; totalCents: number }) {
  const [, run, pending] = useToastedAction(bookAccruals);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="onDate" value={onDate} />
      <Button type="submit" disabled={pending || totalCents === 0}>
        Book {formatCents(totalCents)} on {onDate}
      </Button>
    </ActionForm>
  );
}

type Run = {
  id: string;
  onDate: string;
  totalCents: number;
  lines: { ref: string }[];
  archivedAt: Date | null;
  archivedReason: string | null;
};

/** Runs booked, newest first; one can be cancelled while its day is open. */
export function AccrualRuns({ runs, canBook }: { runs: Run[]; canBook: boolean }) {
  if (runs.length === 0)
    return <p className="text-sm text-muted-foreground">No costs to receive booked yet.</p>;
  return (
    <ul className="grid gap-2">
      {runs.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            <span className="font-mono">ACR-{r.onDate}</span> · {r.lines.length} shipments ·{" "}
            <span className="tabular-nums">{formatCents(r.totalCents)}</span>
          </span>
          {r.archivedAt ? (
            <ToneBadge tone="neutral">Cancelled — {r.archivedReason}</ToneBadge>
          ) : (
            canBook && (
              <ReasonDialog
                action={cancelAccruals}
                hidden={{ id: r.id }}
                trigger="Cancel"
                title={`Cancel the costs to receive of ${r.onDate}?`}
                description="Both entries leave the books; the run stays on the record with your reason."
                confirmLabel="Cancel run"
              />
            )
          )}
        </li>
      ))}
    </ul>
  );
}

import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { formatCents } from "@/domain/money";
import type { paymentsOfInvoice } from "../queries";
import { reversePayment } from "../payment-actions";

type Row = Awaited<ReturnType<typeof paymentsOfInvoice>>[number];

/** Every payment on the invoice, reversals kept in view with their date and reason. */
export function PaymentHistory({ rows, canReverse }: { rows: Row[]; canReverse: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No payment yet.</p>;
  return (
    <ul className="grid gap-2">
      {rows.map(({ payment: p }) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm last:border-0"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{p.date}</span>
            <span className="tabular-nums">{formatCents(p.amountCents)}</span>
            <span className="text-muted-foreground">
              {p.method}
              {p.reference ? ` · ${p.reference}` : ""}
            </span>
            {p.diffCents > 0 && (
              <span className="text-xs text-muted-foreground">
                + {formatCents(p.diffCents)} written off to {p.diffAccount}
              </span>
            )}
            {p.status === "reversed" && (
              <ToneBadge tone="neutral">
                Reversed {p.reversedOn} — {p.reversalReason}
              </ToneBadge>
            )}
          </span>
          {canReverse && p.status === "posted" && (
            <ReasonDialog
              action={reversePayment}
              hidden={{ id: p.id, version: p.version }}
              trigger="Reverse"
              title="Reverse this payment?"
              description="It stays in the books as booked and undone, dated today. The invoice opens again."
              confirmLabel="Reverse"
            />
          )}
        </li>
      ))}
    </ul>
  );
}

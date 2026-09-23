import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { cancelSepaBatch } from "../sepa-actions";
import type { sepaScreen } from "../sepa-queries";

type Row = Awaited<ReturnType<typeof sepaScreen>>["batches"][number];

/** Files made, newest first: download again, or cancel one the bank refused. */
export function SepaBatches({ rows, canCancel }: { rows: Row[]; canCancel: boolean }) {
  if (rows.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">No file made yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Execution</TableHead>
          <TableHead>File</TableHead>
          <TableHead className="text-right">Payments</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ batch: b, by, count }) => (
          <TableRow key={b.id}>
            <TableCell className="font-mono text-xs">{b.executionDate}</TableCell>
            <TableCell>
              <a
                className="font-mono text-xs hover:underline"
                href={`/accounting/sepa/${b.id}/file`}
              >
                {b.msgId}
              </a>
              <span className="text-xs text-muted-foreground"> · {by ?? "—"}</span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{count}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(b.totalCents)}</TableCell>
            <TableCell>
              {b.archivedAt ? (
                <ToneBadge tone="neutral">Cancelled — {b.archivedReason}</ToneBadge>
              ) : canCancel ? (
                <ReasonDialog
                  action={cancelSepaBatch}
                  hidden={{ id: b.id }}
                  trigger="Cancel file"
                  title="Cancel this SEPA file?"
                  description="Only when the bank refused it: its bills can then go in a new file."
                  confirmLabel="Cancel file"
                />
              ) : (
                <ToneBadge tone="info">Sent</ToneBadge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

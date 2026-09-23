import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { accountLedger } from "@/domain/ledger";
import { formatCents } from "@/domain/money";
import { sourceHref } from "./journal-list";

const num = "text-right tabular-nums";

/** One account's movements with the running balance. */
export function LedgerTable({ rows }: { rows: ReturnType<typeof accountLedger>["rows"] }) {
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No movement in this period.</p>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Label</TableHead>
          <TableHead className={num}>Debit</TableHead>
          <TableHead className={num}>Credit</TableHead>
          <TableHead className={num}>Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ entry: e, line: l, balanceCents }, i) => (
          <TableRow key={`${e.source.id}-${e.ref}-${i}`}>
            <TableCell className="font-mono text-xs">{e.date}</TableCell>
            <TableCell>
              <Link className="font-mono hover:underline" href={sourceHref(e)}>
                {e.ref}
              </Link>
            </TableCell>
            <TableCell className="max-w-64 truncate">{l.label || e.label}</TableCell>
            <TableCell className={num}>{l.cents > 0 ? formatCents(l.cents) : ""}</TableCell>
            <TableCell className={num}>{l.cents < 0 ? formatCents(-l.cents) : ""}</TableCell>
            <TableCell className={num}>{formatCents(balanceCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

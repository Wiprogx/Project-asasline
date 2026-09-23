import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AGE_BUCKETS, type agedBalance } from "@/domain/ledger";
import { formatCents } from "@/domain/money";

const num = "text-right tabular-nums";

/** Open amounts per partner, by how late they are. */
export function AgedTable({ rows, who }: { rows: ReturnType<typeof agedBalance>; who: string }) {
  if (rows.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Nothing open.</p>;
  const col = (b: (typeof AGE_BUCKETS)[number]) => rows.reduce((s, r) => s + r.buckets[b], 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{who}</TableHead>
          {AGE_BUCKETS.map((b) => (
            <TableHead key={b} className={num}>
              {b}
            </TableHead>
          ))}
          <TableHead className={num}>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.partner}>
            <TableCell className="max-w-56 truncate">{r.partner}</TableCell>
            {AGE_BUCKETS.map((b) => (
              <TableCell key={b} className={num}>
                {r.buckets[b] ? formatCents(r.buckets[b]) : ""}
              </TableCell>
            ))}
            <TableCell className={`${num} font-medium`}>{formatCents(r.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          {AGE_BUCKETS.map((b) => (
            <TableCell key={b} className={num}>
              {formatCents(col(b))}
            </TableCell>
          ))}
          <TableCell className={num}>
            {formatCents(rows.reduce((s, r) => s + r.total, 0))}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

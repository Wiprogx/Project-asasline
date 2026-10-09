import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/domain/money";

type Row = {
  month: string;
  documents: number;
  salesCents: number;
  purchasesCents: number;
  dueCents: number;
  deductibleCents: number;
  balanceCents: number;
};

const num = "text-right tabular-nums";

/** The year month by month (legacy VAT by month): what each one would declare, as the documents stand. */
export function VatMonthsTable({ rows }: { rows: Row[] }) {
  const sum = (k: Exclude<keyof Row, "month">) => rows.reduce((s, r) => s + r[k], 0);
  return (
    <Table aria-label="VAT by month">
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead className={num}>Documents</TableHead>
          <TableHead className={num}>Sales</TableHead>
          <TableHead className={num}>Purchases</TableHead>
          <TableHead className={num}>VAT due</TableHead>
          <TableHead className={num}>Deductible</TableHead>
          <TableHead className={num}>Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.month}>
            <TableCell>
              <Link className="font-mono hover:underline" href={`/accounting/vat?p=${r.month}`}>
                {r.month}
              </Link>
            </TableCell>
            <TableCell className={num}>{r.documents}</TableCell>
            <TableCell className={num}>{formatCents(r.salesCents)}</TableCell>
            <TableCell className={num}>{formatCents(r.purchasesCents)}</TableCell>
            <TableCell className={num}>{formatCents(r.dueCents)}</TableCell>
            <TableCell className={num}>{formatCents(r.deductibleCents)}</TableCell>
            <TableCell className={num}>{formatCents(r.balanceCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Year</TableCell>
          <TableCell className={num}>{sum("documents")}</TableCell>
          <TableCell className={num}>{formatCents(sum("salesCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("purchasesCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("dueCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("deductibleCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("balanceCents"))}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

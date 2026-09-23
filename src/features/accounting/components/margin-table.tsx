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
import { cn } from "@/lib/utils";

const num = "text-right tabular-nums";

type Row = {
  bookingId: string;
  ref: string;
  customer: string | null;
  revenueCents: number;
  costCents: number;
  marginCents: number;
};

/** What each shipment earned: its sales against the supplier bills recorded on it. */
export function MarginTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No shipment invoiced or billed in this period.
      </p>
    );
  const sum = (k: "revenueCents" | "costCents" | "marginCents") =>
    rows.reduce((s, r) => s + r[k], 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className={num}>Sales</TableHead>
          <TableHead className={num}>Costs</TableHead>
          <TableHead className={num}>Margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.bookingId}>
            <TableCell>
              <Link className="font-mono hover:underline" href={`/bookings/${r.bookingId}/billing`}>
                {r.ref}
              </Link>
            </TableCell>
            <TableCell className="max-w-56 truncate">{r.customer ?? "—"}</TableCell>
            <TableCell className={num}>{formatCents(r.revenueCents)}</TableCell>
            <TableCell className={num}>{formatCents(r.costCents)}</TableCell>
            <TableCell className={cn(num, r.marginCents < 0 && "text-destructive")}>
              {formatCents(r.marginCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className={num}>{formatCents(sum("revenueCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("costCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("marginCents"))}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

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
import type { accrualsScreen } from "../accrual-queries";

const num = "text-right tabular-nums";
type Line = Awaited<ReturnType<typeof accrualsScreen>>["lines"][number];

/** Sailed shipments: the cost the quotation expected, what suppliers invoiced, what is to come. */
export function AccrualsTable({ lines }: { lines: Line[] }) {
  if (lines.length === 0)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Every shipment sailed by that day is fully invoiced by its suppliers.
      </p>
    );
  const sum = (k: "expectedCents" | "billedCents" | "cents") => lines.reduce((s, l) => s + l[k], 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead>Sailed</TableHead>
          <TableHead className={num}>Expected cost</TableHead>
          <TableHead className={num}>Invoiced by suppliers</TableHead>
          <TableHead className={num}>To come</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((l) => (
          <TableRow key={l.bookingId}>
            <TableCell>
              <Link className="font-mono hover:underline" href={`/bookings/${l.bookingId}/billing`}>
                {l.ref}
              </Link>
              <span className="text-muted-foreground"> · {l.client ?? "—"}</span>
            </TableCell>
            <TableCell className="font-mono text-xs">{l.etd}</TableCell>
            <TableCell className={num}>{formatCents(l.expectedCents)}</TableCell>
            <TableCell className={num}>{formatCents(l.billedCents)}</TableCell>
            <TableCell className={num}>{formatCents(l.cents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className={num}>{formatCents(sum("expectedCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("billedCents"))}</TableCell>
          <TableCell className={num}>{formatCents(sum("cents"))}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

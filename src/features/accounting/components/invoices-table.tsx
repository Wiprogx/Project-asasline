import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { openCents, payState } from "@/domain/payments";
import type { InvoiceRow } from "../queries";
import { InvoiceBadge } from "./invoice-badge";
import { PayStateBadge } from "./pay-state-badge";

export function InvoicesTable({ rows, today }: { rows: InvoiceRow[]; today: string }) {
  if (rows.length === 0)
    return <p className="py-10 text-center text-sm text-muted-foreground">No invoices match.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="hidden md:table-cell">Booking</TableHead>
          <TableHead className="hidden md:table-cell">Date · due</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((i) => (
          <TableRow key={i.id}>
            <TableCell>
              <Link
                href={`/accounting/invoices/${i.id}`}
                className="font-mono font-medium hover:underline"
              >
                {i.number ?? "draft"}
              </Link>
            </TableCell>
            <TableCell className="max-w-48 truncate">{i.customer}</TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">
              {i.bookingRef ?? "—"}
            </TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">
              {i.issueDate ? `${i.issueDate} · ${i.dueDate}` : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {i.kind === "credit" ? "−" : ""}
              {formatCents(i.grossCents)}
            </TableCell>
            <TableCell>
              {i.status === "issued" && i.kind === "invoice" ? (
                <span className="flex flex-wrap items-center gap-1">
                  <PayStateBadge
                    state={payState({
                      grossCents: i.grossCents ?? 0,
                      settledCents: i.settled,
                      creditedCents: i.credited,
                      dueDate: i.dueDate,
                      today,
                    })}
                  />
                  {openCents(i.grossCents ?? 0, i.settled, i.credited) > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      open {formatCents(openCents(i.grossCents ?? 0, i.settled, i.credited))}
                    </span>
                  )}
                </span>
              ) : (
                <InvoiceBadge kind={i.kind} status={i.status} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

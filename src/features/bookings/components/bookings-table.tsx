import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import type { BookingRow } from "../queries";
import { BookingStatusBadge } from "./booking-status-badge";
import { BILL_STATUS_LABEL, BILL_STATUS_TONE } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import { ToneBadge } from "@/components/shared/tone-badge";

export function BookingsTable({ rows }: { rows: BookingRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No bookings match.</p>;
  }
  return (
    <Table aria-label="Bookings">
      <TableHeader>
        <TableRow>
          <TableHead>Ref</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="hidden md:table-cell">Route</TableHead>
          <TableHead className="hidden lg:table-cell">Direction</TableHead>
          <TableHead className="hidden md:table-cell">Loading</TableHead>
          <TableHead className="hidden text-right xl:table-cell">Value</TableHead>
          <TableHead className="hidden lg:table-cell">Invoiced</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              <Link href={`/bookings/${b.id}`} className="font-mono font-medium hover:underline">
                {b.ref}
              </Link>
            </TableCell>
            <TableCell className="max-w-48 truncate">{b.clientName}</TableCell>
            <TableCell className="hidden md:table-cell">
              {b.pol || b.pod ? `${b.pol ?? "?"} → ${b.pod ?? "?"}` : "—"}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {SHIPMENT_KIND_LABEL[b.kind].split(" — ")[0]}
            </TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">
              {b.loadDate ?? "—"}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums xl:table-cell">
              {b.valueCents ? formatCents(b.valueCents) : "—"}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {b.billing !== "none" && (
                <ToneBadge tone={BILL_STATUS_TONE[b.billing]}>
                  {BILL_STATUS_LABEL[b.billing]}
                </ToneBadge>
              )}
            </TableCell>
            <TableCell>
              <BookingStatusBadge status={b.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

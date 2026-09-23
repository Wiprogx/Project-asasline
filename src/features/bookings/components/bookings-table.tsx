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

export function BookingsTable({ rows }: { rows: BookingRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No bookings match.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ref</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="hidden md:table-cell">Route</TableHead>
          <TableHead className="hidden lg:table-cell">Direction</TableHead>
          <TableHead className="hidden md:table-cell">Loading</TableHead>
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
            <TableCell>
              <BookingStatusBadge status={b.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

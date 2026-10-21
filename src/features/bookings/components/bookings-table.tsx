import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BOOKING_COLUMNS, type BookingColumnKey } from "@/domain/booking-list";
import type { BookingRow } from "../list-queries";
import { CELLS } from "./booking-cells";
import { PagerSource } from "@/components/shared/pager-source";

/**
 * The bookings, in the columns the office chose (legacy B_COLS): the reference always first,
 * the table scrolls sideways when many are shown.
 */
export function BookingsTable({
  rows,
  columns = ["ref", "client", "route", "loadDate", "value", "billing", "status"],
  today,
}: {
  rows: BookingRow[];
  columns?: readonly BookingColumnKey[];
  today: string;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No bookings match.</p>;
  }
  const cols = BOOKING_COLUMNS.filter((c) => c.key === "ref" || columns.includes(c.key));
  return (
    <Table aria-label="Bookings" style={{ minWidth: `${Math.max(640, cols.length * 120)}px` }}>
      <PagerSource kind="bookings" ids={rows.map((r) => r.id)} />
      <TableHeader>
        <TableRow>
          {cols.map((c) => (
            <TableHead key={c.key} className={c.key === "value" ? "text-right" : undefined}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={b.id}>
            {cols.map((c) => (
              <TableCell
                key={c.key}
                className={c.key === "value" ? "text-right align-top" : "align-top"}
              >
                {CELLS[c.key](b, today)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

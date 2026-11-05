"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { type CellMenuItem, MenuCell, similarAndOut } from "@/components/shared/cell-menu";
import { PagerSource } from "@/components/shared/pager-source";
import { ResizableHead } from "@/components/shared/resizable-head";
import { ariaSort, SortToggle } from "@/components/shared/sortable-head";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { BOOKING_COLUMNS, BOOKING_REF_COLUMN, type BookingColumnKey } from "@/domain/booking-list";
import { BOOKING_STATUS_META, SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import { useColumnWidths, type Widths } from "@/hooks/use-column-widths";
import { useUrlSort } from "@/hooks/use-url-sort";
import { hrefWith } from "@/lib/url";
import type { BookingRow } from "../list-queries";
import { saveBookingView } from "../view-actions";
import { CELLS } from "./booking-cells";

type Key = "ref" | BookingColumnKey;
type Params = URLSearchParams;

/** What a cell's right-click menu filters on: the value it shows, kept or left out by the URL. */
function menuOf(key: Key, b: BookingRow, path: string, params: Params): CellMenuItem[] {
  const to = (patch: Record<string, string | null>) => hrefWith(path, params, patch);
  if (key === "client")
    return similarAndOut(
      `Customer: ${b.clientName}`,
      to({ client: b.clientName, xclient: null }),
      to({ xclient: b.clientName, client: null }),
    );
  if (key === "status")
    return similarAndOut(
      `Status: ${BOOKING_STATUS_META[b.status].label}`,
      to({ status: b.status, xstatus: null }),
      to({ xstatus: b.status, status: null }),
    );
  if (key === "kind")
    return similarAndOut(
      `Type: ${SHIPMENT_KIND_LABEL[b.kind].split(" — ")[0]}`,
      to({ kind: b.kind, xkind: null }),
      to({ xkind: b.kind, kind: null }),
    );
  if (key === "route" && b.pod)
    return similarAndOut(
      `Destination: ${b.pod}`,
      to({ pod: b.pod, xpod: null }),
      to({ xpod: b.pod, pod: null }),
    );
  return [];
}

const saveWidths = (widths: Widths) => saveBookingView({ widths });

/**
 * The bookings in the columns the person chose (legacy B_COLS), each as wide as they dragged it,
 * ordered as asked; the reference always first. A right click on a cell keeps or leaves out the
 * rows like it, on the pages that read those filters.
 */
export function BookingsTable({
  rows,
  columns,
  widths: given,
  today,
  filterable = true,
}: {
  rows: BookingRow[];
  columns: readonly BookingColumnKey[];
  widths: Widths;
  today: string;
  /** false on a page that does not read the menu's filters (a contact's Bookings tab). */
  filterable?: boolean;
}) {
  const { widths, resize, pending } = useColumnWidths(given, saveWidths);
  const { state, toggleSort } = useUrlSort();
  const pathname = usePathname();
  const params = useSearchParams();
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No bookings match.</p>;
  }
  const cols = [BOOKING_REF_COLUMN, ...BOOKING_COLUMNS.filter((c) => columns.includes(c.key))];
  const widthOf = (c: (typeof cols)[number]) => widths[c.key] ?? c.width;
  const total = cols.reduce((sum, c) => sum + widthOf(c), 0);
  const items = (key: Key, b: BookingRow) => (filterable ? menuOf(key, b, pathname, params) : []);
  return (
    <Table
      aria-label="Bookings"
      aria-busy={pending}
      className="table-fixed"
      style={{ minWidth: total }}
    >
      <PagerSource kind="bookings" ids={rows.map((r) => r.id)} />
      <colgroup>
        {cols.map((c) => (
          <col key={c.key} style={{ width: widthOf(c) }} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          {cols.map((c) => (
            <ResizableHead
              key={c.key}
              label={c.label}
              width={widthOf(c)}
              onResize={(px) => resize(c.key, px)}
              aria-sort={ariaSort(state, c.key)}
              className={c.key === "value" ? "text-right" : undefined}
            >
              <SortToggle sortKey={c.key} state={state} onSort={toggleSort}>
                {c.label}
              </SortToggle>
            </ResizableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={b.id}>
            {cols.map((c) => (
              <MenuCell
                key={c.key}
                items={items(c.key, b)}
                className={
                  c.key === "value"
                    ? "overflow-hidden text-right align-top"
                    : "overflow-hidden align-top"
                }
              >
                {CELLS[c.key](b, today)}
              </MenuCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

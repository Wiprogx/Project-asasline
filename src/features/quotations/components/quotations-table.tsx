"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type CellMenuItem, MenuCell, similarAndOut } from "@/components/shared/cell-menu";
import { PagerSource } from "@/components/shared/pager-source";
import { ResizableHead } from "@/components/shared/resizable-head";
import { ariaSort, SortToggle } from "@/components/shared/sortable-head";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import {
  QUOTATION_COLUMNS,
  QUOTATION_REF_COLUMN,
  type QuotationColumnKey,
} from "@/domain/quotation-list";
import { useColumnWidths, type Widths } from "@/hooks/use-column-widths";
import { useUrlSort } from "@/hooks/use-url-sort";
import { hrefWith } from "@/lib/url";
import type { QuotationRow } from "../queries";
import { QUOTATION_TONE } from "../status";
import { saveQuotationView } from "../view-actions";

const none = <span className="text-muted-foreground">—</span>;

const CELLS: Record<QuotationColumnKey, (q: QuotationRow) => React.ReactNode> = {
  customer: (q) => q.clientName,
  validUntil: (q) =>
    q.validUntil ? <span className="font-mono text-xs">{q.validUntil}</span> : none,
  value: (q) => (q.valueCents ? formatCents(q.valueCents) : none),
  destinations: (q) => q.destinations || none,
  status: (q) => (
    <ToneBadge tone={QUOTATION_TONE[q.status][1]}>{QUOTATION_TONE[q.status][0]}</ToneBadge>
  ),
};

const saveWidths = (widths: Widths) => saveQuotationView({ widths });

/** The quotations in the columns the person chose, each as wide as they dragged it, ordered as asked. */
export function QuotationsTable({
  rows,
  columns,
  widths: given,
}: {
  rows: QuotationRow[];
  columns: readonly QuotationColumnKey[];
  widths: Widths;
}) {
  const { widths, resize, pending } = useColumnWidths(given, saveWidths);
  const { state, toggleSort } = useUrlSort();
  const pathname = usePathname();
  const params = useSearchParams();
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No quotations match.</p>;
  }
  const cols = [QUOTATION_REF_COLUMN, ...QUOTATION_COLUMNS.filter((c) => columns.includes(c.key))];
  const widthOf = (c: (typeof cols)[number]) => widths[c.key] ?? c.width;
  const total = cols.reduce((sum, c) => sum + widthOf(c), 0);
  // The right-click menu: the rows like this one, or without it (the URL does the narrowing).
  const menuOf = (key: QuotationColumnKey, q: QuotationRow): CellMenuItem[] => {
    if (key === "customer")
      return similarAndOut(
        `Customer: ${q.clientName}`,
        hrefWith(pathname, params, { client: q.clientName, xclient: null }),
        hrefWith(pathname, params, { xclient: q.clientName, client: null }),
      );
    if (key === "status")
      return similarAndOut(
        `Status: ${QUOTATION_TONE[q.status][0]}`,
        hrefWith(pathname, params, { status: q.status, xstatus: null }),
        hrefWith(pathname, params, { xstatus: q.status, status: null }),
      );
    return [];
  };
  return (
    <Table
      aria-label="Quotations"
      aria-busy={pending}
      className="table-fixed"
      style={{ minWidth: total }}
    >
      <PagerSource kind="quotations" ids={rows.map((r) => r.id)} />
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
        {rows.map((q) => (
          <TableRow key={q.id}>
            <MenuCell items={[]} className="overflow-hidden">
              <Link href={`/quotations/${q.id}`} className="font-mono font-medium hover:underline">
                {q.ref}
              </Link>
            </MenuCell>
            {cols.slice(1).map((c) => (
              <MenuCell
                key={c.key}
                items={menuOf(c.key as QuotationColumnKey, q)}
                className={
                  c.key === "value" ? "overflow-hidden text-right tabular-nums" : "overflow-hidden"
                }
              >
                {CELLS[c.key as QuotationColumnKey](q)}
              </MenuCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

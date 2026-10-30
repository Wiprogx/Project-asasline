"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { DEFAULT_RATE_SOURCES, type RateSource, sourceLabel } from "@/domain/rate-sources";
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import type { listRateItems } from "../queries";

type Row = Awaited<ReturnType<typeof listRateItems>>[number];

/** The search (?q=) and the category are the server's; the rate source and the order are here. */
function specFor(
  sources: readonly RateSource[],
  label: (code: string) => string,
  today: string,
): TableSpec<Row> {
  return {
    filters: [
      {
        key: "source",
        label: "Rate",
        options: sources.map((s) => ({ value: s.key, label: s.label })),
        test: (r, v) => r.rateType === v,
      },
      {
        key: "valid",
        label: "Validity",
        options: [
          { value: "current", label: "Holding" },
          { value: "expired", label: "Expired" },
        ],
        test: (r, v) => Boolean(r.validUntil && r.validUntil < today) === (v === "expired"),
      },
    ],
    sorts: {
      item: (r) => r.label,
      category: (r) => label(r.category),
      rate: (r) => sourceLabel(sources, r.rateType),
      until: (r) => r.validUntil,
      sell: (r) => r.sellCents,
      buy: (r) => r.buyCents,
      margin: (r) => r.sellCents - r.buyCents,
    },
  };
}

/** The catalogue: what we sell, what it costs us, and until when the rate holds. */
export function RateItemsTable({
  rows,
  categories,
  today,
  sources = DEFAULT_RATE_SOURCES,
}: {
  rows: Row[];
  categories: { code: string; label: string }[];
  today: string;
  sources?: readonly RateSource[];
}) {
  const spec = useMemo(() => {
    const label = (code: string) => categories.find((c) => c.code === code)?.label ?? code;
    return { label, spec: specFor(sources, label, today) };
  }, [sources, categories, today]);
  const view = useTableView(rows, spec.spec);
  const head = { state: view.state, onSort: view.toggleSort };
  const label = spec.label;
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={spec.spec.filters}
        searchLabel="Search a port, carrier, name…"
        noun="items"
      />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No item here.</p>
      ) : (
        <Table aria-label="Rate items">
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="item" {...head}>
                Item
              </SortableHead>
              <SortableHead sortKey="category" {...head}>
                Category
              </SortableHead>
              <SortableHead sortKey="rate" {...head}>
                Rate
              </SortableHead>
              <SortableHead sortKey="until" {...head}>
                Valid until
              </SortableHead>
              <SortableHead sortKey="sell" className="text-right" {...head}>
                Sell
              </SortableHead>
              <SortableHead sortKey="buy" className="text-right" {...head}>
                Buy
              </SortableHead>
              <SortableHead sortKey="margin" className="text-right" {...head}>
                Margin
              </SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <Link
                    className="font-medium hover:underline"
                    href={`/settings/catalogue/${it.id}`}
                  >
                    {it.label}
                  </Link>
                </TableCell>
                <TableCell>{label(it.category)}</TableCell>
                <TableCell>{sourceLabel(sources, it.rateType)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {it.validUntil && it.validUntil < today ? (
                    <ToneBadge tone="danger">expired {it.validUntil}</ToneBadge>
                  ) : (
                    (it.validUntil ?? "—")
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(it.sellCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(it.buyCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(it.sellCents - it.buyCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

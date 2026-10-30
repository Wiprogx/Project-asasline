"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listIsLive } from "@/domain/pricing";
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import type { listPriceLists } from "../queries";

type Row = Awaited<ReturnType<typeof listPriceLists>>[number];

const stateOf = (r: Row, today: string) =>
  listIsLive(r.list, today) ? "live" : r.list.active ? "idle" : "off";

const STATE_LABEL = { live: "In force", idle: "Not in force", off: "Switched off" } as const;

function specFor(today: string): TableSpec<Row> {
  return {
    search: (r) => [r.list.name, r.contact],
    filters: [
      {
        key: "state",
        label: "Today",
        options: Object.entries(STATE_LABEL).map(([value, label]) => ({ value, label })),
        test: (r, v) => stateOf(r, today) === v,
      },
    ],
    sorts: {
      name: (r) => r.list.name,
      customer: (r) => r.contact,
      from: (r) => r.list.validFrom,
      until: (r) => r.list.validUntil,
      state: (r) => STATE_LABEL[stateOf(r, today)],
    },
  };
}

export function PriceListsTable({ rows, today }: { rows: Row[]; today: string }) {
  const spec = useMemo(() => specFor(today), [today]);
  const view = useTableView(rows, spec);
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">No agreement yet.</p>;
  const head = { state: view.state, onSort: view.toggleSort };
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={spec.filters}
        searchLabel="Search an agreement or customer"
        noun="agreements"
      />
      <Table aria-label="Price lists">
        <TableHeader>
          <TableRow>
            <SortableHead sortKey="name" {...head}>
              Agreement
            </SortableHead>
            <SortableHead sortKey="customer" {...head}>
              Customer
            </SortableHead>
            <SortableHead sortKey="from" {...head}>
              From
            </SortableHead>
            <SortableHead sortKey="until" {...head}>
              Until
            </SortableHead>
            <TableHead>Today</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((r) => {
            const l = r.list;
            const state = stateOf(r, today);
            return (
              <TableRow key={l.id}>
                <TableCell>
                  <Link
                    className="font-medium hover:underline"
                    href={`/settings/price-lists/${l.id}`}
                  >
                    {l.name}
                  </Link>
                </TableCell>
                <TableCell>{r.contact}</TableCell>
                <TableCell className="font-mono text-xs">{l.validFrom ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{l.validUntil ?? "open"}</TableCell>
                <TableCell>
                  <ToneBadge tone={state === "live" ? "success" : "neutral"}>
                    {STATE_LABEL[state]}
                  </ToneBadge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

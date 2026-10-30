"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { VESSEL_STATUS_META, VESSEL_STATUSES } from "@/domain/vessels";
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import type { listVessels } from "../queries";

type Row = Awaited<ReturnType<typeof listVessels>>[number];

/** The search (?q=) is the server's; the state, the carrier and the order are here. */
function specFor(rows: Row[]): TableSpec<Row> {
  const carriers = [...new Set(rows.map((r) => r.vessel.carrier).filter(Boolean))] as string[];
  return {
    filters: [
      {
        key: "state",
        label: "State",
        options: VESSEL_STATUSES.map((x) => ({ value: x, label: VESSEL_STATUS_META[x].label })),
        test: (r, v) => r.vessel.status === v,
      },
      {
        key: "carrier",
        label: "Carrier",
        options: carriers.sort().map((c) => ({ value: c, label: c })),
        test: (r, v) => r.vessel.carrier === v,
      },
    ],
    sorts: {
      vessel: (r) => `${r.vessel.name} ${r.vessel.voyage}`,
      carrier: (r) => r.vessel.carrier,
      route: (r) => `${r.vessel.pol ?? ""} ${r.vessel.pod ?? ""}`.trim(),
      etd: (r) => r.vessel.etd,
      eta: (r) => r.vessel.eta,
      state: (r) => VESSEL_STATUS_META[r.vessel.status].label,
      bookings: (r) => r.bookings,
    },
  };
}

export function VesselsTable({ rows }: { rows: Row[] }) {
  const spec = useMemo(() => specFor(rows), [rows]);
  const view = useTableView(rows, spec);
  const head = { state: view.state, onSort: view.toggleSort };
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={spec.filters}
        searchLabel="Search a vessel, voyage, carrier or port…"
        noun="sailings"
      />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No sailing yet.</p>
      ) : (
        <Table aria-label="Vessels">
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="vessel" {...head}>
                Vessel · voyage
              </SortableHead>
              <SortableHead sortKey="carrier" {...head}>
                Carrier
              </SortableHead>
              <SortableHead sortKey="route" {...head}>
                Route
              </SortableHead>
              <SortableHead sortKey="etd" {...head}>
                ETD
              </SortableHead>
              <SortableHead sortKey="eta" {...head}>
                ETA
              </SortableHead>
              <SortableHead sortKey="state" {...head}>
                State
              </SortableHead>
              <SortableHead sortKey="bookings" className="text-right" {...head}>
                Bookings
              </SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.map(({ vessel: v, bookings }) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link className="font-medium hover:underline" href={`/settings/vessels/${v.id}`}>
                    {v.name} · {v.voyage}
                  </Link>
                </TableCell>
                <TableCell>{v.carrier ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {v.pol ?? "?"} › {v.pod ?? "?"}
                </TableCell>
                <TableCell className="font-mono text-xs">{v.etd ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{v.eta ?? "—"}</TableCell>
                <TableCell>
                  <ToneBadge tone={VESSEL_STATUS_META[v.status].tone}>
                    {VESSEL_STATUS_META[v.status].label}
                  </ToneBadge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{bookings}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

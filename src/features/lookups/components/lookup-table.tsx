"use client";

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
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import type { LookupColumn, LookupMeta } from "../meta";
import type { LookupRow, LookupSelects } from "../queries";

/** "2 quotations · 1 booking", or a dash when nothing names it. */
function usage(r: LookupRow) {
  const parts = Object.entries(r.usage ?? {})
    .filter(([, n]) => n > 0)
    .map(([what, n]) => `${n} ${what}${n > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" · ") : "—";
}

const used = (r: LookupRow) => Object.values(r.usage ?? {}).reduce((a, n) => a + n, 0);

const SPEC: TableSpec<LookupRow> = {
  search: (r) => [r.label, r.archivedReason, ...Object.values(r.columns).map((v) => String(v))],
  filters: [
    {
      key: "state",
      label: "State",
      options: [
        { value: "live", label: "Offered" },
        { value: "archived", label: "Archived" },
      ],
      test: (r, v) => Boolean(r.archivedAt) === (v === "archived"),
    },
    {
      key: "use",
      label: "In use",
      options: [
        { value: "yes", label: "Named by records" },
        { value: "no", label: "Not named" },
      ],
      test: (r, v) => used(r) > 0 === (v === "yes"),
    },
  ],
  sorts: { label: (r) => r.label, order: (r) => r.position, used },
};

/** One of the row's own columns as the table shows it: a badge, a figure, the words, the pick's name. */
function ColumnCell({
  c,
  value,
  selects,
}: {
  c: LookupColumn;
  value: unknown;
  selects: LookupSelects;
}) {
  if (c.type === "bool")
    return (
      <TableCell>{value === true && <ToneBadge tone="neutral">{c.column}</ToneBadge>}</TableCell>
    );
  if (value === null || value === undefined) return <TableCell>—</TableCell>;
  if (c.type === "int")
    return (
      <TableCell className="text-right tabular-nums">
        {Number(value).toLocaleString("en")}
      </TableCell>
    );
  if (c.type === "select")
    return <TableCell>{selects[c.key]?.find((o) => o.value === value)?.label ?? "—"}</TableCell>;
  return <TableCell className="whitespace-normal">{String(value)}</TableCell>;
}

function LookupLine({
  meta,
  r,
  selects,
  actions,
}: {
  meta: LookupMeta;
  r: LookupRow;
  selects: LookupSelects;
  actions: React.ReactNode;
}) {
  return (
    <TableRow className={r.archivedAt ? "text-muted-foreground" : undefined}>
      <TableCell className="whitespace-normal">
        {r.label} {r.code && <ToneBadge tone="info">Used by the app</ToneBadge>}
        {r.archivedAt && <ToneBadge tone="neutral">Archived</ToneBadge>}
        {r.archivedReason && <span className="block text-xs">{r.archivedReason}</span>}
      </TableCell>
      {meta.columns?.map((c) => (
        <ColumnCell key={c.key} c={c} value={r.columns[c.key]} selects={selects} />
      ))}
      <TableCell className="text-right tabular-nums">{r.position}</TableCell>
      <TableCell>{usage(r)}</TableCell>
      <TableCell className="text-right">{actions}</TableCell>
    </TableRow>
  );
}

/** The list's rows: their words, their own columns, their order and what names them. */
export function LookupTable({
  meta,
  rows,
  selects,
  renderActions,
}: {
  meta: LookupMeta;
  rows: LookupRow[];
  selects: LookupSelects;
  renderActions: (r: LookupRow) => React.ReactNode;
}) {
  const view = useTableView(rows, SPEC);
  const head = { state: view.state, onSort: view.toggleSort };
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={SPEC.filters}
        searchLabel={`Search a ${meta.noun.toLowerCase()}`}
        noun="rows"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead sortKey="label" {...head}>
              {meta.noun}
            </SortableHead>
            {meta.columns?.map((c) => (
              <TableHead key={c.key} className={c.type === "int" ? "text-right" : undefined}>
                {c.column}
              </TableHead>
            ))}
            <SortableHead sortKey="order" className="w-24 text-right" {...head}>
              Order
            </SortableHead>
            <SortableHead sortKey="used" {...head}>
              Used by
            </SortableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((r) => (
            <LookupLine key={r.id} meta={meta} r={r} selects={selects} actions={renderActions(r)} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

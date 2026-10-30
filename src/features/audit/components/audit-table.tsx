"use client";

import { useMemo } from "react";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
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
import { formatStamp } from "@/lib/stamp";
import type { AuditRow } from "../queries";

const UNKNOWN = "unknown";
const options = (values: (string | null)[]) =>
  [...new Set(values.map((v) => v ?? UNKNOWN))].sort().map((v) => ({ value: v, label: v }));

/** The search (?q=) is the server's, by action; who and what are narrowed among the rows read. */
function specFor(rows: AuditRow[]): TableSpec<AuditRow> {
  return {
    filters: [
      {
        key: "who",
        label: "Who",
        options: options(rows.map((r) => r.who)),
        test: (r, v) => (r.who ?? UNKNOWN) === v,
      },
      {
        key: "entity",
        label: "On",
        options: options(rows.map((r) => r.entity)),
        test: (r, v) => (r.entity ?? UNKNOWN) === v,
      },
    ],
    sorts: {
      when: (r) => new Date(r.at).getTime(),
      who: (r) => r.who,
      what: (r) => r.action,
    },
  };
}

/** Brussels time, "YYYY-MM-DD HH:MM", the same on every screen whatever the server's zone. */
export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const spec = useMemo(() => specFor(rows), [rows]);
  const view = useTableView(rows, spec);
  const head = { state: view.state, onSort: view.toggleSort };
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={spec.filters}
        searchLabel="Filter by action: login, booking., user.…"
        noun="lines"
      />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <Table aria-label="Audit">
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="when" {...head}>
                When
              </SortableHead>
              <SortableHead sortKey="who" {...head}>
                Who
              </SortableHead>
              <SortableHead sortKey="what" {...head}>
                What
              </SortableHead>
              <TableHead className="hidden lg:table-cell">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {formatStamp(r.at)}
                </TableCell>
                <TableCell>
                  {r.who ?? <span className="text-muted-foreground">unknown</span>}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.action}
                  {r.entity && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {r.entity}
                      {r.entityId && ` ${r.entityId.slice(0, 8)}`}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-md truncate font-mono text-xs text-muted-foreground lg:table-cell">
                  {r.detail ? JSON.stringify(r.detail) : ""}
                  {r.ip && ` · ${r.ip}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

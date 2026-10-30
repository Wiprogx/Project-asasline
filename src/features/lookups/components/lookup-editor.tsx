"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FormDialog } from "@/components/shared/form-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LookupKind } from "@/domain/lookup-tables";
import { useToastedAction } from "@/hooks/use-action-toast";
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import { archiveLookup, createLookup, restoreLookup, updateLookup } from "../actions";
import type { LookupRow } from "../queries";
import { createLookupSchema, restoreLookupSchema } from "../schemas";
import { LOOKUP_META } from "../meta";
import { LookupFields } from "./lookup-fields";

/** "2 quotations · 1 booking", or a dash when nothing names it. */
function usage(r: LookupRow) {
  const parts = Object.entries(r.usage ?? {})
    .filter(([, n]) => n > 0)
    .map(([what, n]) => `${n} ${what}${n > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" · ") : "—";
}

const used = (r: LookupRow) => Object.values(r.usage ?? {}).reduce((a, n) => a + n, 0);

const SPEC: TableSpec<LookupRow> = {
  search: (r) => [r.label, r.archivedReason],
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

function AddRow({ kind }: { kind: LookupKind }) {
  const [state, run, pending] = useToastedAction(createLookup, undefined, createLookupSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={run} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-start">
      <input type="hidden" name="kind" value={kind} />
      <LookupFields prefix="new-" fe={fe} {...LOOKUP_META[kind]} />
      <Button type="submit" className="sm:mt-6" disabled={pending}>
        Add {LOOKUP_META[kind].noun.toLowerCase()}
      </Button>
    </ActionForm>
  );
}

function PutBack({ kind, r }: { kind: LookupKind; r: LookupRow }) {
  const [, run, pending] = useToastedAction(restoreLookup, undefined, restoreLookupSchema);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="version" value={r.version} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Put back
      </Button>
    </ActionForm>
  );
}

function RowActions({ kind, r }: { kind: LookupKind; r: LookupRow }) {
  if (r.archivedAt) return <PutBack kind={kind} r={r} />;
  const hidden = { kind, id: r.id, version: r.version };
  return (
    <span className="flex flex-wrap justify-end gap-2">
      <FormDialog
        action={updateLookup}
        hidden={hidden}
        trigger="Edit"
        title={`Edit — ${r.label}`}
        description="The records that name this reason read the new words."
        submitLabel="Save"
        size="md"
      >
        {(fe) => (
          <LookupFields
            prefix={`ed-${r.id}-`}
            fe={fe}
            label={r.label}
            position={r.position}
            checked={r.flag}
            {...LOOKUP_META[kind]}
          />
        )}
      </FormDialog>
      {!r.code && (
        <ReasonDialog
          action={archiveLookup}
          hidden={hidden}
          trigger="Archive"
          title={`Archive "${r.label}"?`}
          description="It is no longer offered; the records that name it keep it. You can put it back."
          confirmLabel="Archive"
        />
      )}
    </span>
  );
}

function LookupLine({ kind, r }: { kind: LookupKind; r: LookupRow }) {
  return (
    <TableRow className={r.archivedAt ? "text-muted-foreground" : undefined}>
      <TableCell className="whitespace-normal">
        {r.label} {r.code && <ToneBadge tone="info">Used by the app</ToneBadge>}
        {r.flag && LOOKUP_META[kind].flag && (
          <ToneBadge tone="neutral">{LOOKUP_META[kind].flag.column}</ToneBadge>
        )}
        {r.archivedAt && <ToneBadge tone="neutral">Archived</ToneBadge>}
        {r.archivedReason && <span className="block text-xs">{r.archivedReason}</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{r.position}</TableCell>
      <TableCell>{usage(r)}</TableCell>
      <TableCell className="text-right">
        <RowActions kind={kind} r={r} />
      </TableCell>
    </TableRow>
  );
}

function LookupTable({ kind, rows }: { kind: LookupKind; rows: LookupRow[] }) {
  const view = useTableView(rows, SPEC);
  const head = { state: view.state, onSort: view.toggleSort };
  const noun = LOOKUP_META[kind].noun;
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={SPEC.filters}
        searchLabel={`Search a ${noun.toLowerCase()}`}
        noun="rows"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead sortKey="label" {...head}>
              {noun}
            </SortableHead>
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
            <LookupLine key={r.id} kind={kind} r={r} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * One Settings list table: what is offered, in this order, and how many records each row names.
 * An archived row is no longer offered but stays where it is named; a row the app gives by
 * itself can be reworded, never archived.
 */
export function LookupEditor({ kind, rows }: { kind: LookupKind; rows: LookupRow[] }) {
  const { title, description } = LOOKUP_META[kind];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <AddRow kind={kind} />
        <LookupTable kind={kind} rows={rows} />
      </CardContent>
    </Card>
  );
}

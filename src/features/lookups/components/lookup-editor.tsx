"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FormDialog } from "@/components/shared/form-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LookupKind } from "@/domain/lookup-tables";
import { useToastedAction } from "@/hooks/use-action-toast";
import { archiveLookup, createLookup, restoreLookup, updateLookup } from "../actions";
import type { LookupRow, LookupSelects } from "../queries";
import { createLookupSchema, restoreLookupSchema } from "../schemas";
import { LOOKUP_META } from "../meta";
import { LookupFields } from "./lookup-fields";
import { LookupTable } from "./lookup-table";

function AddRow({ kind, selects }: { kind: LookupKind; selects: LookupSelects }) {
  const [state, run, pending] = useToastedAction(createLookup, undefined, createLookupSchema(kind));
  const fe = !state.ok ? state.fieldErrors : undefined;
  const meta = LOOKUP_META[kind];
  const wide = (meta.columns?.length ?? 0) > 0;
  return (
    <ActionForm
      action={run}
      className={
        wide
          ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_8rem_auto] lg:items-start"
          : "grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-start"
      }
    >
      <input type="hidden" name="kind" value={kind} />
      <LookupFields prefix="new-" fe={fe} meta={meta} selects={selects} />
      <Button type="submit" className="sm:mt-6" disabled={pending}>
        Add {meta.noun.toLowerCase()}
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

function RowActions({
  kind,
  r,
  selects,
}: {
  kind: LookupKind;
  r: LookupRow;
  selects: LookupSelects;
}) {
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
            columns={r.columns}
            meta={LOOKUP_META[kind]}
            selects={selects}
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

/**
 * One Settings list table: what is offered, in this order, and how many records each row names.
 * An archived row is no longer offered but stays where it is named; a row the app gives by
 * itself can be reworded, never archived. `selects`: the rows the list's pick columns offer.
 */
export function LookupEditor({
  kind,
  rows,
  selects = {},
}: {
  kind: LookupKind;
  rows: LookupRow[];
  selects?: LookupSelects;
}) {
  const meta = LOOKUP_META[kind];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.title}</CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <AddRow kind={kind} selects={selects} />
        <LookupTable
          meta={meta}
          rows={rows}
          selects={selects}
          renderActions={(r) => <RowActions kind={kind} r={r} selects={selects} />}
        />
      </CardContent>
    </Card>
  );
}

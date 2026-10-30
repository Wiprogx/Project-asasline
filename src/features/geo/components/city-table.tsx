"use client";

import { CityPicker } from "@/components/shared/city-picker";
import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { archiveCity, createCity, mergeCity, restoreCity, updateCity } from "../city-actions";
import type { CityRow } from "../queries";
import { PutBack } from "./put-back";

type Errors = Record<string, string[] | undefined> | undefined;

/** A city's name, region, other names and notes; its country is the page's. */
function CityFields({ prefix, fe, c }: { prefix: string; fe: Errors; c?: CityRow }) {
  const id = (n: string) => `${prefix}${n}`;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={id("name")} label="Name" error={fe?.name} required>
        <Input id={id("name")} name="name" defaultValue={c?.name} required maxLength={120} />
      </Field>
      <Field id={id("region")} label="Region" error={fe?.region} hint="Province or state">
        <Input id={id("region")} name="region" defaultValue={c?.region ?? ""} maxLength={120} />
      </Field>
      <Field
        id={id("aliases")}
        label="Other names"
        error={fe?.aliases}
        hint="Separated by ; — the city field finds the city by any of them."
        className="sm:col-span-full"
      >
        <Input id={id("aliases")} name="aliases" defaultValue={c?.aliases.join("; ") ?? ""} />
      </Field>
      <Field id={id("notes")} label="Notes" error={fe?.notes} className="sm:col-span-full">
        <Textarea id={id("notes")} name="notes" defaultValue={c?.notes ?? ""} rows={2} />
      </Field>
    </div>
  );
}

export function AddCity({ country }: { country: string }) {
  return (
    <FormDialog
      action={createCity}
      hidden={{ country }}
      trigger="Add a city"
      title="Add a city"
      description="Offered on this country's city fields from now on."
      submitLabel="Add"
      size="md"
    >
      {(fe) => <CityFields prefix="new-city-" fe={fe} />}
    </FormDialog>
  );
}

function MergeCity({ c, country }: { c: CityRow; country: string }) {
  return (
    <FormDialog
      action={mergeCity}
      hidden={{ id: c.id, version: c.version }}
      trigger="Merge into…"
      title={`Merge ${c.name} into…`}
      description={`Its ${c.contacts} contact(s) move to the city picked; ${c.name} is archived, remembering where they went.`}
      submitLabel="Merge"
      size="md"
    >
      {(fe) => (
        <Field id={`merge-${c.id}`} label="The right city" error={fe?.intoId} required>
          <CityPicker id={`merge-${c.id}`} name="intoId" country={country} required />
        </Field>
      )}
    </FormDialog>
  );
}

function RowActions({ c, country }: { c: CityRow; country: string }) {
  if (c.archivedAt) return <PutBack action={restoreCity} id={c.id} version={c.version} />;
  const hidden = { id: c.id, version: c.version };
  return (
    <span className="flex flex-wrap justify-end gap-2">
      <FormDialog
        action={updateCity}
        hidden={hidden}
        trigger="Edit"
        title={`Edit — ${c.name}`}
        description="Every contact of the city reads the new words."
        submitLabel="Save"
        size="md"
      >
        {(fe) => <CityFields prefix={`ed-${c.id}-`} fe={fe} c={c} />}
      </FormDialog>
      <MergeCity c={c} country={country} />
      <ReasonDialog
        action={archiveCity}
        hidden={hidden}
        trigger="Archive"
        title={`Archive ${c.name}?`}
        description="It is no longer offered on the city fields; its contacts keep it. You can put it back."
        confirmLabel="Archive"
      />
    </span>
  );
}

function CityLine({ c, country }: { c: CityRow; country: string }) {
  return (
    <TableRow className={c.archivedAt ? "text-muted-foreground" : undefined}>
      <TableCell className="whitespace-normal">
        <span className="font-medium">{c.name}</span>{" "}
        {!c.fromList && <ToneBadge tone="warning">To check</ToneBadge>}
        {c.notes && <span className="block text-xs text-muted-foreground">{c.notes}</span>}
        {c.archivedReason && <span className="block text-xs">{c.archivedReason}</span>}
      </TableCell>
      <TableCell className="whitespace-normal">{c.region ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {c.population ? c.population.toLocaleString("en") : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">{c.contacts}</TableCell>
      <TableCell className="text-right">
        <RowActions c={c} country={country} />
      </TableCell>
    </TableRow>
  );
}

/** A country's cities, the biggest first: what its city fields offer. */
export function CityTable({ rows, country }: { rows: CityRow[]; country: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>City</TableHead>
          <TableHead>Region</TableHead>
          <TableHead className="text-right">Inhabitants</TableHead>
          <TableHead className="text-right">Contacts</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <CityLine key={c.id} c={c} country={country} />
        ))}
      </TableBody>
    </Table>
  );
}

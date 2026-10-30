"use client";

import Link from "next/link";
import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { archiveCountry, createCountry, restoreCountry, updateCountry } from "../country-actions";
import type { CountryRow } from "../queries";
import { PutBack } from "./put-back";

type Errors = Record<string, string[] | undefined> | undefined;

/** The office's name for the country, its dial code and the language written there. */
function CountryFields({ prefix, fe, c }: { prefix: string; fe: Errors; c?: CountryRow }) {
  const id = (n: string) => `${prefix}${n}`;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {!c && (
        <Field id={id("code")} label="ISO code" error={fe?.code} hint="It stays." required>
          <Input
            id={id("code")}
            name="code"
            required
            maxLength={2}
            className="font-mono uppercase"
          />
        </Field>
      )}
      <Field id={id("name")} label="Name" error={fe?.name} required>
        <Input id={id("name")} name="name" defaultValue={c?.name} required maxLength={80} />
      </Field>
      <Field id={id("dial")} label="Dial code" error={fe?.dial} hint="e.g. +32">
        <Input id={id("dial")} name="dial" defaultValue={c?.dial} maxLength={5} />
      </Field>
      <Field id={id("lang")} label="Language" error={fe?.lang} hint="Two letters, e.g. fr" required>
        <Input id={id("lang")} name="lang" defaultValue={c?.lang ?? "en"} required maxLength={2} />
      </Field>
    </div>
  );
}

export function AddCountry() {
  return (
    <FormDialog
      action={createCountry}
      hidden={{}}
      trigger="Add a country"
      title="Add a country"
      description="Every ISO country is already in the table; add one only for a code of its own."
      submitLabel="Add"
      size="md"
    >
      {(fe) => <CountryFields prefix="new-country-" fe={fe} />}
    </FormDialog>
  );
}

function RowActions({ c }: { c: CountryRow }) {
  if (c.archivedAt) return <PutBack action={restoreCountry} id={c.id} version={c.version} />;
  const hidden = { id: c.id, version: c.version };
  return (
    <span className="flex flex-wrap justify-end gap-2">
      <FormDialog
        action={updateCountry}
        hidden={hidden}
        trigger="Edit"
        title={`Edit — ${c.name} (${c.code})`}
        description="Every contact of the country reads the new words; its code stays."
        submitLabel="Save"
        size="md"
      >
        {(fe) => <CountryFields prefix={`ed-${c.id}-`} fe={fe} c={c} />}
      </FormDialog>
      <ReasonDialog
        action={archiveCountry}
        hidden={hidden}
        trigger="Archive"
        title={`Archive ${c.name}?`}
        description="It is no longer offered on the country fields; its contacts keep it. You can put it back."
        confirmLabel="Archive"
      />
    </span>
  );
}

/** The countries: what every country field offers, each with its cities and its contacts. */
export function CountryTable({ rows }: { rows: CountryRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Code</TableHead>
          <TableHead>Country</TableHead>
          <TableHead className="w-20">Dial</TableHead>
          <TableHead className="w-20">Language</TableHead>
          <TableHead className="text-right">Cities</TableHead>
          <TableHead className="text-right">Contacts</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className={c.archivedAt ? "text-muted-foreground" : undefined}>
            <TableCell className="font-mono">{c.code}</TableCell>
            <TableCell className="whitespace-normal">
              <Link href={`/settings/countries/${c.code}`} className="font-medium hover:underline">
                {c.name}
              </Link>
              {c.archivedAt && <ToneBadge tone="neutral">Archived</ToneBadge>}
              {c.archivedReason && <span className="block text-xs">{c.archivedReason}</span>}
            </TableCell>
            <TableCell className="font-mono">{c.dial || "—"}</TableCell>
            <TableCell className="font-mono">{c.lang}</TableCell>
            <TableCell className="text-right tabular-nums">{c.cities}</TableCell>
            <TableCell className="text-right tabular-nums">{c.contacts}</TableCell>
            <TableCell className="text-right">
              <RowActions c={c} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

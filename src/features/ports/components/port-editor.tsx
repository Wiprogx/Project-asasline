"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FormDialog } from "@/components/shared/form-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PORT_KIND_LABELS } from "@/domain/ports";
import { useToastedAction } from "@/hooks/use-action-toast";
import { archivePort, createPort, restorePort, updatePort } from "../actions";
import type { PortRow } from "../queries";
import { restorePortSchema } from "../schemas";
import { PortFields } from "./port-fields";

type Option = { value: string; label: string };

/** "3 bookings · 1 sailing", or a dash when nothing names the port. */
function usage(p: PortRow) {
  const parts = (
    [
      [p.quotations, "destination"],
      [p.bookings, "booking"],
      [p.catalogue, "catalogue item"],
      [p.sailings, "sailing"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, what]) => `${n} ${what}${n > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" · ") : "—";
}

export function AddPort({ regions }: { regions: readonly Option[] }) {
  return (
    <FormDialog
      action={createPort}
      hidden={{}}
      trigger="Add a port"
      title="Add a port"
      description="Offered on every port field from now on."
      submitLabel="Add"
      size="xl"
    >
      {(fe) => <PortFields prefix="new-port-" fe={fe} regions={regions} />}
    </FormDialog>
  );
}

function PutBack({ p }: { p: PortRow }) {
  const [, run, pending] = useToastedAction(restorePort, undefined, restorePortSchema);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="version" value={p.version} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Put back
      </Button>
    </ActionForm>
  );
}

function RowActions({ p, regions }: { p: PortRow; regions: readonly Option[] }) {
  if (p.archivedAt) return <PutBack p={p} />;
  const hidden = { id: p.id, version: p.version };
  return (
    <span className="flex flex-wrap justify-end gap-2">
      <FormDialog
        action={updatePort}
        hidden={hidden}
        trigger="Edit"
        title={`Edit — ${p.code} ${p.name}`}
        description="The records that name this port read the new details; its code stays."
        submitLabel="Save"
        size="xl"
      >
        {(fe) => <PortFields prefix={`ed-${p.id}-`} fe={fe} regions={regions} port={p} />}
      </FormDialog>
      <ReasonDialog
        action={archivePort}
        hidden={hidden}
        trigger="Archive"
        title={`Archive ${p.code} ${p.name}?`}
        description="It is no longer offered on the port fields; the records that name it keep it. You can put it back."
        confirmLabel="Archive"
      />
    </span>
  );
}

function PortLine({ p, regions }: { p: PortRow; regions: readonly Option[] }) {
  return (
    <TableRow className={p.archivedAt ? "text-muted-foreground" : undefined}>
      <TableCell className="font-mono">{p.code}</TableCell>
      <TableCell className="whitespace-normal">
        {p.name}{" "}
        {p.kind !== "sea" && <ToneBadge tone="neutral">{PORT_KIND_LABELS[p.kind]}</ToneBadge>}
        {p.preClearance && <ToneBadge tone="info">Pre-clearance</ToneBadge>}
        {p.aliases.length > 0 && <span className="block text-xs">{p.aliases.join(" · ")}</span>}
        {p.archivedReason && <span className="block text-xs">{p.archivedReason}</span>}
      </TableCell>
      <TableCell className="font-mono">{p.country}</TableCell>
      <TableCell className="whitespace-normal">{p.region ?? "—"}</TableCell>
      <TableCell>{p.timezone ?? "—"}</TableCell>
      <TableCell className="whitespace-normal">{usage(p)}</TableCell>
      <TableCell className="text-right">
        <RowActions p={p} regions={regions} />
      </TableCell>
    </TableRow>
  );
}

/**
 * The ports table: every port the office ships from and to, by code. An archived port is no
 * longer offered but stays where it is named; nothing is deleted.
 */
export function PortTable({ rows, regions }: { rows: PortRow[]; regions: readonly Option[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Code</TableHead>
          <TableHead>Port</TableHead>
          <TableHead className="w-20">Country</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Time zone</TableHead>
          <TableHead>Used by</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <PortLine key={p.id} p={p} regions={regions} />
        ))}
      </TableBody>
    </Table>
  );
}

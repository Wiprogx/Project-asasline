"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { importOdooBalances, importOdooContacts, importOdooDocs } from "../odoo-actions";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const ACTIONS: Record<string, Action> = {
  contacts: importOdooContacts,
  sale: importOdooDocs,
  purchase: importOdooDocs,
  balances: importOdooBalances,
};

/** One Odoo export: the file, and (for documents and balances) the cut-over day. */
export function OdooUpload({
  kind,
  label,
  cutoff,
}: {
  kind: "contacts" | "sale" | "purchase" | "balances";
  label: string;
  cutoff?: string;
}) {
  const [, run, pending] = useToastedAction(ACTIONS[kind]);
  return (
    <ActionForm action={run} className="flex flex-wrap items-end gap-2">
      {(kind === "sale" || kind === "purchase") && <input type="hidden" name="side" value={kind} />}
      {cutoff !== undefined && (
        <Field id={`odoo-cut-${kind}`} label="Cut-over day">
          <Input id={`odoo-cut-${kind}`} name="cutoff" type="date" defaultValue={cutoff} required />
        </Field>
      )}
      <Input
        name="file"
        type="file"
        accept=".csv,.txt"
        required
        aria-label={label}
        className="max-w-xs"
      />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Reading…" : "Import"}
      </Button>
    </ActionForm>
  );
}

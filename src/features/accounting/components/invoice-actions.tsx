"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import { creditInvoice, discardDraft, issueInvoice } from "../actions";

type Term = { id: string; name: string };

function Issue({
  id,
  version,
  termId,
  terms,
}: {
  id: string;
  version: number;
  termId: string | null;
  terms: Term[];
}) {
  const [, run, pending] = useToastedAction(issueInvoice);
  return (
    <ActionForm action={run} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <NativeSelect
        name="paymentTermId"
        aria-label="Payment term"
        defaultValue={termId ?? "d30"}
        className="w-56"
        options={terms.map((t) => ({ value: t.id, label: t.name }))}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Issuing…" : "Issue invoice"}
      </Button>
    </ActionForm>
  );
}

function Credit({ id, version }: { id: string; version: number }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(creditInvoice, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Credit this invoice</DialogTrigger>
      <DialogContent>
        <ActionForm action={run} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Credit this invoice</DialogTitle>
            <DialogDescription>
              An issued invoice is never edited. A credit note for all of it is issued now, in its
              own series.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <Textarea
            name="reason"
            required
            minLength={3}
            placeholder="Why? It is printed on the credit note."
            aria-label="Reason"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="redraft"
              defaultChecked
              className="size-4 accent-primary"
            />
            Start a corrected draft with the same lines
          </label>
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              Issue the credit note
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

/** What an invoice allows in its state: a draft is issued or discarded; an issued one credited. */
export function InvoiceActions(p: {
  id: string;
  version: number;
  status: "draft" | "issued" | "discarded";
  kind: "invoice" | "credit";
  credited: boolean;
  termId: string | null;
  terms: Term[];
  canIssue: boolean;
}) {
  const print = p.status === "issued" && (
    <>
      <Button variant="outline" render={<Link href={`/print/invoices/${p.id}`} target="_blank" />}>
        Print / PDF
      </Button>
      <Button variant="outline" render={<a href={`/accounting/invoices/${p.id}/ubl`} download />}>
        Peppol file (UBL)
      </Button>
    </>
  );
  if (!p.canIssue) return print || null;
  if (p.status === "draft")
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Issue id={p.id} version={p.version} termId={p.termId} terms={p.terms} />
        <ReasonDialog
          action={discardDraft}
          hidden={{ id: p.id, version: p.version }}
          trigger="Discard draft"
          title="Discard this draft?"
          description="It is kept with your reason and never gets a number."
          confirmLabel="Discard"
        />
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {print}
      {p.status === "issued" && p.kind === "invoice" && !p.credited && (
        <Credit id={p.id} version={p.version} />
      )}
    </div>
  );
}

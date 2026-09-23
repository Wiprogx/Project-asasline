"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { discardDraft } from "../actions";
import { approveBill, newBill, recordBill } from "../bill-actions";
import { importUbl } from "../peppol-actions";

type Option = { id: string; name: string };

/** Start a supplier's bill: for the office, or (with bookingId) as a cost of that shipment. */
export function NewBillForm({ suppliers, bookingId }: { suppliers: Option[]; bookingId?: string }) {
  const [, run, pending] = useToastedAction(newBill);
  return (
    <ActionForm action={run} className="flex flex-wrap items-center gap-2">
      {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}
      <NativeSelect
        name="supplierId"
        required
        aria-label="Supplier"
        placeholder="Supplier…"
        className="w-64"
        options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
      />
      <Button
        type="submit"
        size="sm"
        variant={bookingId ? "outline" : "default"}
        disabled={pending}
      >
        {bookingId ? "Record a supplier bill" : "New bill"}
      </Button>
    </ActionForm>
  );
}

function RecordBill({
  id,
  version,
  billDate,
  due,
  supplierRef,
}: {
  id: string;
  version: number;
  billDate: string;
  due: string;
  supplierRef: string | null;
}) {
  const [state, run, pending] = useToastedAction(recordBill);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm
      action={run}
      className="grid gap-2 sm:grid-cols-[10rem_9rem_9rem_auto] sm:items-end"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Field id="b-ref" label="Supplier's number" error={fe?.supplierRef}>
        <Input id="b-ref" name="supplierRef" defaultValue={supplierRef ?? ""} required />
      </Field>
      <Field id="b-date" label="Bill date" error={fe?.billDate}>
        <Input id="b-date" name="billDate" type="date" defaultValue={billDate} required />
      </Field>
      <Field id="b-due" label="Due" error={fe?.dueDate}>
        <Input id="b-due" name="dueDate" type="date" defaultValue={due} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record bill"}
      </Button>
    </ActionForm>
  );
}

function Approve({ id, version }: { id: string; version: number }) {
  const [, run, pending] = useToastedAction(approveBill);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Button type="submit" disabled={pending}>
        Approve for payment
      </Button>
    </ActionForm>
  );
}

/** What a bill allows: a draft is recorded or discarded; a large recorded bill is approved. */
export function BillActions(p: {
  id: string;
  version: number;
  status: "draft" | "issued" | "discarded";
  needsApproval: boolean;
  approved: boolean;
  canIssue: boolean;
  canApprove: boolean;
  billDate: string;
  due: string;
  supplierRef: string | null;
}) {
  if (p.status === "draft" && p.canIssue)
    return (
      <div className="flex flex-wrap items-end gap-2">
        <RecordBill
          id={p.id}
          version={p.version}
          billDate={p.billDate}
          due={p.due}
          supplierRef={p.supplierRef}
        />
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
  if (p.status !== "issued" || !p.needsApproval) return null;
  if (p.approved) return <ToneBadge tone="success">Approved for payment</ToneBadge>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToneBadge tone="warning">Needs a second person&apos;s approval</ToneBadge>
      {p.canApprove && <Approve id={p.id} version={p.version} />}
    </div>
  );
}

/** A supplier's Peppol (UBL) XML file becomes a draft bill to check and record. */
export function ImportUblForm() {
  const [, run, pending] = useToastedAction(importUbl);
  return (
    <ActionForm action={run} className="flex flex-wrap items-center gap-2">
      <Input
        name="file"
        type="file"
        accept=".xml"
        required
        aria-label="Peppol invoice (UBL XML)"
        className="max-w-xs"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Reading…" : "Import Peppol file"}
      </Button>
    </ActionForm>
  );
}

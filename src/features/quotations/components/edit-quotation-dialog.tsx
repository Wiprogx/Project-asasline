"use client";

import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SHIPMENT_KIND_LABEL, SHIPMENT_KINDS, type ShipmentKind } from "@/domain/shipments";
import { updateQuotation } from "../status-actions";

export type QuotationHeader = {
  id: string;
  version: number;
  clientId: string;
  kind: ShipmentKind;
  commodity: string | null;
  docType: string | null;
  validUntil: string | null;
  paymentTermId: string | null;
  note: string | null;
};
type Option = { value: string; label: string };

/** The quotation's own fields (legacy editQ); destinations and lines are edited below. */
export function EditQuotationDialog({
  q,
  clients,
  docTypes,
  terms,
}: {
  q: QuotationHeader;
  clients: Option[];
  docTypes: string[];
  terms: Option[];
}) {
  const id = (name: string) => `qe-${name}`;
  return (
    <FormDialog
      action={updateQuotation}
      hidden={{ id: q.id, version: q.version }}
      trigger="Edit quotation"
      title="Edit the quotation"
      description="Destinations and their lines are edited on the quotation itself."
      submitLabel="Save quotation"
    >
      {(fe) => (
        <>
          <Field id={id("clientId")} label="Customer" error={fe?.clientId}>
            <NativeSelect
              id={id("clientId")}
              name="clientId"
              required
              defaultValue={q.clientId}
              options={clients}
            />
          </Field>
          <Field id={id("kind")} label="Direction" error={fe?.kind}>
            <NativeSelect
              id={id("kind")}
              name="kind"
              defaultValue={q.kind}
              options={SHIPMENT_KINDS.map((k) => ({ value: k, label: SHIPMENT_KIND_LABEL[k] }))}
            />
          </Field>
          <Field id={id("commodity")} label="Commodity (HS)" error={fe?.commodity}>
            <Input id={id("commodity")} name="commodity" defaultValue={q.commodity ?? ""} />
          </Field>
          <Field id={id("docType")} label="Document type" error={fe?.docType}>
            <NativeSelect
              id={id("docType")}
              name="docType"
              defaultValue={q.docType ?? ""}
              placeholder="—"
              options={docTypes.map((d) => ({ value: d, label: d }))}
            />
          </Field>
          <Field id={id("validUntil")} label="Valid until" error={fe?.validUntil}>
            <Input
              id={id("validUntil")}
              name="validUntil"
              type="date"
              defaultValue={q.validUntil ?? ""}
            />
          </Field>
          <Field id={id("paymentTermId")} label="Payment terms" error={fe?.paymentTermId}>
            <NativeSelect
              id={id("paymentTermId")}
              name="paymentTermId"
              defaultValue={q.paymentTermId ?? ""}
              placeholder="The office default"
              options={terms}
            />
          </Field>
          <Field id={id("note")} label="Note" error={fe?.note}>
            <Textarea id={id("note")} name="note" defaultValue={q.note ?? ""} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

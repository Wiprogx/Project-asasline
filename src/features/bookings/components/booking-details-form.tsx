"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DOC_TYPES, SHIPMENT_KIND_LABEL, SHIPMENT_KINDS } from "@/domain/shipments";
import { useToastedAction } from "@/hooks/use-action-toast";
import { updateBookingDetails } from "../details-actions";

type Values = { id: string; version: number; [field: string]: string | number | null };
type Option = { id: string; name: string };

const PARTY_FIELDS = [
  ["payerId", "Payer (invoiced)"],
  ["shipperId", "Shipper"],
  ["consigneeId", "Consignee"],
  ["notifyId", "Notify party"],
] as const;

const TEXT = (
  [
    ["pol", "Port of loading", "text"],
    ["pod", "Port of discharge", "text"],
    ["loadDate", "Loading date", "date"],
    ["loadTime", "Loading time", "time"],
    ["commodity", "Commodity", "text"],
    ["carrierBookingNo", "Carrier booking no.", "text"],
    ["blNo", "B/L no.", "text"],
    ["vesselName", "Vessel", "text"],
    ["voyage", "Voyage", "text"],
    ["etd", "ETD", "date"],
    ["eta", "ETA", "date"],
  ] as const
).map(([name, label, type]) => ({ name, label, type }));

export function BookingDetailsForm({ values, contacts }: { values: Values; contacts: Option[] }) {
  const [state, action, pending] = useToastedAction(updateBookingDetails);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const contactOptions = contacts.map((c) => ({ value: c.id, label: c.name }));

  return (
    <ActionForm action={action} className="grid gap-4">
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="version" value={values.version} />
      <Card>
        <CardHeader>
          <CardTitle>Parties</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {PARTY_FIELDS.map(([name, label]) => (
            <Field key={name} id={name} label={label} error={fe?.[name]}>
              <NativeSelect
                id={name}
                name={name}
                defaultValue={values[name] ?? ""}
                placeholder="—"
                options={contactOptions}
              />
            </Field>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shipment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="kind" label="Direction">
            <NativeSelect
              id="kind"
              name="kind"
              defaultValue={values.kind ?? "export"}
              options={SHIPMENT_KINDS.map((k) => ({ value: k, label: SHIPMENT_KIND_LABEL[k] }))}
            />
          </Field>
          <Field id="docType" label="Transport document">
            <NativeSelect
              id="docType"
              name="docType"
              defaultValue={values.docType ?? "SEA WAYBILL"}
              options={DOC_TYPES.map((d) => ({ value: d, label: d }))}
            />
          </Field>
          {TEXT.map((f) => (
            <Field key={f.name} id={f.name} label={f.label} error={fe?.[f.name]}>
              <Input
                id={f.name}
                name={f.name}
                type={f.type}
                defaultValue={values[f.name] ?? ""}
                aria-invalid={!!fe?.[f.name]}
              />
            </Field>
          ))}
          <Field id="loadAddress" label="Loading address" className="sm:col-span-2 lg:col-span-3">
            <Input id="loadAddress" name="loadAddress" defaultValue={values.loadAddress ?? ""} />
          </Field>
        </CardContent>
      </Card>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save booking"}
        </Button>
      </div>
    </ActionForm>
  );
}

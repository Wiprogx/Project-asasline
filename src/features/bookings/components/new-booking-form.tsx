"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SHIPMENT_KIND_LABEL, SHIPMENT_KINDS } from "@/domain/shipments";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createBooking } from "../actions";

type Option = { id: string; name: string };

export function NewBookingForm({
  clients,
  containerTypes,
}: {
  clients: Option[];
  containerTypes: string[];
}) {
  const [state, action, pending] = useToastedAction(createBooking);
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <ActionForm action={action} className="grid max-w-3xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="clientId" label="Customer" error={fe?.clientId}>
          <NativeSelect
            id="clientId"
            name="clientId"
            required
            placeholder="Choose…"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field id="kind" label="Direction">
          <NativeSelect
            id="kind"
            name="kind"
            defaultValue="export"
            options={SHIPMENT_KINDS.map((k) => ({ value: k, label: SHIPMENT_KIND_LABEL[k] }))}
          />
        </Field>
        <Field id="pol" label="Port of loading" hint="UN/LOCODE, e.g. BEANR">
          <Input id="pol" name="pol" list="ports" />
        </Field>
        <Field id="pod" label="Port of discharge" hint="UN/LOCODE, e.g. TRMER">
          <Input id="pod" name="pod" list="ports" />
        </Field>
        <Field id="loadDate" label="Loading date" error={fe?.loadDate}>
          <Input id="loadDate" name="loadDate" type="date" />
        </Field>
        <Field id="commodity" label="Commodity">
          <Input id="commodity" name="commodity" />
        </Field>
        <Field id="containerType" label="Container type">
          <NativeSelect
            id="containerType"
            name="containerType"
            defaultValue="40HC"
            options={containerTypes.map((t) => ({ value: t, label: t }))}
          />
        </Field>
        <Field id="containerCount" label="Number of containers" error={fe?.containerCount}>
          <Input
            id="containerCount"
            name="containerCount"
            type="number"
            min={1}
            max={50}
            defaultValue={1}
          />
        </Field>
      </div>
      <Field id="loadAddress" label="Loading address">
        <Input id="loadAddress" name="loadAddress" />
      </Field>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create booking"}
        </Button>
      </div>
    </ActionForm>
  );
}

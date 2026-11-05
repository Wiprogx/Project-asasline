"use client";

import { type ReactNode, useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { SearchPicker } from "@/components/shared/search-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type CustomerPlace, defaultLoadPlace } from "@/domain/load-place";
import { SHIPMENT_KIND_LABEL, SHIPMENT_KINDS } from "@/domain/shipments";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createBooking } from "../actions";
import { newBookingSchema } from "../schemas";
import { PlaceField } from "./place-field";

type Option = { id: string; name: string };

export function NewBookingForm({
  clients,
  containerTypes,
  newPlace,
}: {
  clients: Option[];
  containerTypes: string[];
  /** "+ New location", rendered by the page (it lives with the contacts). */
  newPlace?: ReactNode;
}) {
  const [state, action, pending] = useToastedAction(createBooking, undefined, newBookingSchema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  // The customer's places, its delivery address — else its own — the loading address by default.
  const [clientId, setClientId] = useState<string | null>(null);
  const [places, setPlaces] = useState<CustomerPlace[]>([]);
  const [loadPlace, setLoadPlace] = useState<string | null>(null);
  const pickClient = async (id: string | null) => {
    const client = id || null;
    setClientId(client);
    const found: CustomerPlace[] = client
      ? await fetch(`/api/contacts/${client}/places`).then((r) => (r.ok ? r.json() : []))
      : [];
    setPlaces(found);
    setLoadPlace(defaultLoadPlace(found, client));
  };

  return (
    <ActionForm action={action} className="grid max-w-3xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="clientId" label="Customer" error={fe?.clientId}>
          <SearchPicker
            id="clientId"
            name="clientId"
            required
            placeholder="Search a customer…"
            empty="No contact matches."
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(id) => void pickClient(id)}
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
      <PlaceField
        id="loadAddressId"
        label="Loading address"
        hint="A place of the customer: its delivery address by default, else its own."
        options={places}
        ownerId={clientId}
        value={loadPlace}
        set={setLoadPlace}
        made={(p) => setPlaces((ps) => [{ ...p, delivery: true }, ...ps])}
        dialog={newPlace}
        error={fe?.loadAddressId}
      />
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

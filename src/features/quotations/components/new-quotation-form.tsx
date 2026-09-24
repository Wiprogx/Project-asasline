"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VAT_CODES } from "@/domain/accounting";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createQuotation } from "../actions";

type Option = { id: string; name: string };

export function NewQuotationForm({
  clients,
  containerTypes,
}: {
  clients: Option[];
  containerTypes: string[];
}) {
  const [state, action, pending] = useToastedAction(createQuotation);
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
        <Field id="validUntil" label="Valid until" error={fe?.validUntil}>
          <Input id="validUntil" name="validUntil" type="date" />
        </Field>
        <Field id="pol" label="Port of loading" error={fe?.pol}>
          <Input id="pol" name="pol" placeholder="BEANR" required list="ports" />
        </Field>
        <Field id="pod" label="Port of discharge" error={fe?.pod}>
          <Input id="pod" name="pod" placeholder="TRMER" required list="ports" />
        </Field>
        <Field id="finalPlace" label="Final delivery place">
          <Input id="finalPlace" name="finalPlace" />
        </Field>
        <Field id="containerType" label="Container type">
          <NativeSelect
            id="containerType"
            name="containerType"
            defaultValue="40HC"
            options={containerTypes.map((t) => ({ value: t, label: t }))}
          />
        </Field>
      </div>
      <Field id="description" label="Service" error={fe?.description}>
        <Input
          id="description"
          name="description"
          defaultValue="Ocean freight, all-inclusive"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="sell" label="Sell (EUR)" error={fe?.sell}>
          <Input id="sell" name="sell" inputMode="decimal" required />
        </Field>
        <Field id="cost" label="Cost (EUR)" error={fe?.cost}>
          <Input id="cost" name="cost" inputMode="decimal" />
        </Field>
        <Field id="vatCode" label="VAT">
          <NativeSelect
            id="vatCode"
            name="vatCode"
            defaultValue="EX41"
            options={VAT_CODES.map((v) => ({ value: v.code, label: `${v.code} · ${v.label}` }))}
          />
        </Field>
      </div>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create quotation"}
        </Button>
      </div>
    </ActionForm>
  );
}

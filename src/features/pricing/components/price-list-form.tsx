"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { createPriceList, updatePriceList } from "../list-actions";

type Values = {
  id?: string;
  version?: number;
  contactId?: string;
  name?: string;
  validFrom?: string | null;
  validUntil?: string | null;
  active?: boolean;
};

/** A customer agreement: who, what it is called, and the days it holds. */
export function PriceListForm({
  customers,
  values,
}: {
  customers: { id: string; name: string }[];
  values?: Values;
}) {
  const editing = !!values?.id;
  const [state, run, pending] = useToastedAction(editing ? updatePriceList : createPriceList);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm
      action={run}
      className="grid gap-2 sm:grid-cols-6 sm:items-end"
      key={editing ? `${values?.id}-${values?.version}` : undefined}
    >
      {editing && (
        <>
          <input type="hidden" name="id" value={values?.id} />
          <input type="hidden" name="version" value={values?.version} />
        </>
      )}
      <Field id="pl-contact" label="Customer" error={fe?.contactId} className="sm:col-span-2">
        <NativeSelect
          id="pl-contact"
          name="contactId"
          required
          defaultValue={values?.contactId ?? ""}
          placeholder="Choose…"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field id="pl-name" label="Agreement" error={fe?.name}>
        <Input
          id="pl-name"
          name="name"
          required
          defaultValue={values?.name ?? ""}
          placeholder="2026 agreement"
        />
      </Field>
      <Field id="pl-from" label="Valid from" error={fe?.validFrom}>
        <Input id="pl-from" name="validFrom" type="date" defaultValue={values?.validFrom ?? ""} />
      </Field>
      <Field id="pl-until" label="Valid until" error={fe?.validUntil} hint="Empty: open-ended">
        <Input
          id="pl-until"
          name="validUntil"
          type="date"
          defaultValue={values?.validUntil ?? ""}
        />
      </Field>
      <Field id="pl-active" label="State" error={fe?.active}>
        <NativeSelect
          id="pl-active"
          name="active"
          defaultValue={values?.active === false ? "0" : "1"}
          options={[
            { value: "1", label: "Active" },
            { value: "0", label: "Switched off" },
          ]}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {editing ? "Save agreement" : "Add agreement"}
      </Button>
    </ActionForm>
  );
}

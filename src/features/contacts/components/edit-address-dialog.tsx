"use client";

import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateAddress } from "../address-actions";

type Address = {
  id: string;
  version: number;
  type: string;
  name: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
};

const FIELDS = [
  ["name", "Name"],
  ["street", "Street"],
  ["zip", "Postcode"],
  ["city", "City"],
  ["country", "Country (ISO-2)"],
  ["phone", "Phone"],
  ["email", "Email"],
] as const;

/** Correct an address or person under the contact in place (legacy editChild). */
export function EditAddressDialog({
  contactId,
  address: a,
  types,
}: {
  contactId: string;
  address: Address;
  types: string[];
}) {
  const f = (name: string) => `ae-${a.id}-${name}`;
  // A kind no longer in the list still shows, so saving does not change it by accident.
  const kinds = types.includes(a.type) ? types : [a.type, ...types];
  return (
    <FormDialog
      action={updateAddress}
      hidden={{ id: a.id, version: a.version, contactId }}
      trigger="Edit"
      title={`Edit — ${a.type}`}
      submitLabel="Save address"
    >
      {(fe) => (
        <>
          <Field id={f("type")} label="Kind" error={fe?.type}>
            <NativeSelect
              id={f("type")}
              name="type"
              required
              defaultValue={a.type}
              options={kinds.map((t) => ({ value: t, label: t }))}
            />
          </Field>
          {FIELDS.map(([name, label]) => (
            <Field key={name} id={f(name)} label={label} error={fe?.[name]}>
              <Input id={f(name)} name={name} defaultValue={a[name] ?? ""} />
            </Field>
          ))}
          <Field id={f("note")} label="Note" error={fe?.note}>
            <Textarea id={f("note")} name="note" defaultValue={a.note ?? ""} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

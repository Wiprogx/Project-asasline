"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addAddress, archiveAddress } from "../address-actions";

type Address = {
  id: string;
  type: string;
  name: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
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

/** Loading, delivery and invoicing addresses, consignees and persons under the contact. */
export function ContactAddresses({
  contactId,
  addresses,
  types,
}: {
  contactId: string;
  addresses: Address[];
  types: string[];
}) {
  const [state, run, pending] = useToastedAction(addAddress);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Addresses and persons</h2>
      </CardHeader>
      <CardContent className="grid gap-3">
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="grid gap-2">
            {addresses.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{a.type}</span>
                  {a.name && <> · {a.name}</>}
                  <span className="block text-muted-foreground">
                    {[a.street, [a.zip, a.city].filter(Boolean).join(" "), a.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                    {a.phone && ` · ${a.phone}`}
                    {a.email && ` · ${a.email}`}
                  </span>
                </span>
                <ReasonDialog
                  action={archiveAddress}
                  hidden={{ id: a.id, contactId }}
                  trigger="Remove"
                  title="Remove this address?"
                  description="It stays on the record with your reason; bookings keep pointing at it."
                  confirmLabel="Remove"
                />
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={run} className="grid gap-2 sm:grid-cols-4 sm:items-end">
          <input type="hidden" name="contactId" value={contactId} />
          <Field id="ad-type" label="Kind" error={fe?.type}>
            <NativeSelect
              id="ad-type"
              name="type"
              required
              placeholder="Kind…"
              options={types.map((t) => ({ value: t, label: t }))}
            />
          </Field>
          {FIELDS.map(([name, label]) => (
            <Field key={name} id={`ad-${name}`} label={label} error={fe?.[name]}>
              <Input id={`ad-${name}`} name={name} />
            </Field>
          ))}
          <Button type="submit" variant="outline" disabled={pending}>
            Add address
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState } from "react";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_TYPES, LANGUAGES } from "@/domain/contacts";
import { useActionToast } from "@/hooks/use-action-toast";
import { type ActionResult, IDLE } from "@/lib/action-result";
import type { ContactFormValues } from "../form-values";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const TEXT_FIELDS = [
  ["email", "Email", "email"],
  ["phone", "Phone", "tel"],
  ["mobile", "Mobile", "tel"],
  ["whatsapp", "WhatsApp", "tel"],
  ["vat", "VAT number", "text"],
  ["eori", "EORI", "text"],
  ["street", "Street", "text"],
  ["zip", "Postcode", "text"],
  ["city", "City", "text"],
  ["country", "Country (ISO-2)", "text"],
  ["website", "Website", "url"],
  ["creditLimit", "Credit limit (EUR)", "text"],
] as const;

export function ContactForm({
  action,
  values = {},
  submitLabel,
}: {
  action: Action;
  values?: ContactFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  useActionToast(state);
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.version && <input type="hidden" name="version" value={values.version} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem_8rem]">
        <Field id="name" label="Name" error={fe?.name}>
          <Input
            id="name"
            name="name"
            defaultValue={values.name ?? ""}
            required
            aria-invalid={!!fe?.name}
          />
        </Field>
        <Field id="type" label="Type">
          <NativeSelect
            id="type"
            name="type"
            defaultValue={values.type ?? "company"}
            options={CONTACT_TYPES.map((t) => ({
              value: t,
              label: t === "company" ? "Company" : "Person",
            }))}
          />
        </Field>
        <Field id="lang" label="Language">
          <NativeSelect
            id="lang"
            name="lang"
            defaultValue={values.lang ?? "en"}
            options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEXT_FIELDS.map(([name, label, type]) => (
          <Field key={name} id={name} label={label} error={fe?.[name]}>
            <Input
              id={name}
              name={name}
              type={type}
              defaultValue={values[name] ?? ""}
              aria-invalid={!!fe?.[name]}
            />
          </Field>
        ))}
      </div>
      <Field id="note" label="Note">
        <Textarea id="note" name="note" defaultValue={values.note ?? ""} rows={3} />
      </Field>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { PricingFields } from "./pricing-fields";
import { Input } from "@/components/ui/input";
import { FormSection, SectionJumps, TextFields, type TextFieldSpec } from "./form-section";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_TYPES, type IdFormat, LANGUAGES } from "@/domain/contacts";
import { CONTACT_KIND_LABEL, CONTACT_KINDS } from "@/domain/contact-list";
import { useToastedAction } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { ContactFormValues } from "../form-values";
import { checkedContactSchema } from "../schemas";
import { useMemo } from "react";
import { type Country } from "@/domain/countries";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const TAX_FIELDS = [
  ["vat", "VAT number", "text"],
  ["eori", "EORI", "text"],
] as const satisfies readonly TextFieldSpec[];

const REACH_FIELDS = [
  ["email", "Email", "email"],
  ["phone", "Phone", "tel"],
  ["mobile", "Mobile", "tel"],
  ["whatsapp", "WhatsApp", "tel"],
  ["website", "Website", "url"],
] as const satisfies readonly TextFieldSpec[];

const ADDRESS_FIELDS = [
  ["street", "Street", "text"],
  ["zip", "Postcode", "text"],
  ["city", "City", "text"],
  ["country", "Country (ISO-2)", "text"],
] as const satisfies readonly TextFieldSpec[];

const CREDIT_FIELDS = [
  ["creditLimit", "Credit limit (EUR)", "text"],
] as const satisfies readonly TextFieldSpec[];

export function ContactForm({
  action,
  values = {},
  submitLabel,
  professions,
  tags,
  idFormats,
  countries,
  terms,
}: {
  action: Action;
  values?: ContactFormValues;
  submitLabel: string;
  /** The professions and tags lists (Settings › Lists), offered as the person types. */
  professions: readonly string[];
  tags: readonly string[];
  /** The VAT and EORI formats (Settings › Number formats), checked in the browser as on the server. */
  idFormats: readonly IdFormat[];
  /** The countries table (Settings › Countries), offered by name as the code is typed. */
  countries: readonly Country[];
  /** The payment terms (Settings › Accounting), offered as the customer's own. */
  terms: readonly { value: string; label: string }[];
}) {
  const schema = useMemo(() => checkedContactSchema(idFormats), [idFormats]);
  const [state, formAction, pending] = useToastedAction(action, undefined, schema);
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <ActionForm action={formAction} className="grid gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.version && <input type="hidden" name="version" value={values.version} />}
      <SectionJumps />
      <FormSection id="contact-identity">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_13rem_8rem]">
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
          <Field id="kind" label="Customer / Supplier">
            <NativeSelect
              id="kind"
              name="kind"
              defaultValue={values.kind ?? "customer"}
              options={CONTACT_KINDS.map((k) => ({ value: k, label: CONTACT_KIND_LABEL[k] }))}
            />
          </Field>
          <Field id="lang" label="Language">
            <NativeSelect
              id="lang"
              name="lang"
              defaultValue={values.lang ?? (values.id ? "en" : "")}
              options={[
                ...(values.id ? [] : [{ value: "", label: "By country" }]),
                ...LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() })),
              ]}
            />
          </Field>
        </div>
      </FormSection>
      <FormSection id="contact-tax">
        <TextFields fields={TAX_FIELDS} values={values} errors={fe} />
      </FormSection>
      <FormSection id="contact-reach">
        <TextFields fields={REACH_FIELDS} values={values} errors={fe} />
      </FormSection>
      <FormSection id="contact-address">
        <TextFields
          fields={ADDRESS_FIELDS}
          values={values}
          errors={fe}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_1fr_10rem]"
          list={{ country: "countries-list" }}
        />
      </FormSection>
      <datalist id="countries-list">
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </datalist>
      <FormSection id="contact-lists">
        <Field
          id="professions"
          label="Professions"
          hint="Comma-separated; the list in Settings › Lists is offered as you type."
          error={fe?.professions}
        >
          <Input
            id="professions"
            name="professions"
            list="professions-list"
            defaultValue={values.professions ?? ""}
            placeholder="Transporter, Used clothing"
          />
        </Field>
        <datalist id="professions-list">
          {professions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Field
          id="tags"
          label="Tags"
          hint="Comma-separated; the list in Settings › Lists is offered as you type."
          error={fe?.tags}
        >
          <Input
            id="tags"
            name="tags"
            list="tags-list"
            defaultValue={values.tags ?? ""}
            placeholder="B2B, Key account"
          />
        </Field>
        <datalist id="tags-list">
          {tags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </FormSection>
      <FormSection id="contact-billing">
        <TextFields fields={CREDIT_FIELDS} values={values} errors={fe} />
        <PricingFields
          terms={terms}
          paymentTermId={values.paymentTermId}
          usesLastPrice={values.usesLastPrice}
        />
      </FormSection>
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
    </ActionForm>
  );
}

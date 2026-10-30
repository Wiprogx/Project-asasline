"use client";

import { useMemo, useRef, useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { IdFormat } from "@/domain/contacts";
import { type Country, langOf } from "@/domain/countries";
import { useToastedAction } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { ContactFormValues } from "../form-values";
import { checkedContactSchema } from "../schemas";
import { AddressFields, type Errors, ReachFields, SiteFields } from "./contact-field-groups";
import { FormSection, SectionJumps, TextFields, type TextFieldSpec } from "./form-section";
import { IdentityFields } from "./identity-fields";
import { PricingFields } from "./pricing-fields";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const VAT = [["vat", "VAT number", "text"]] as const satisfies readonly TextFieldSpec[];
const EORI = [["eori", "EORI", "text"]] as const satisfies readonly TextFieldSpec[];
const PASSPORT = [
  ["passportNumber", "Passport number", "text"],
] as const satisfies readonly TextFieldSpec[];
const CREDIT_FIELDS = [
  ["creditLimit", "Credit limit (EUR)", "text"],
] as const satisfies readonly TextFieldSpec[];

/** A company's VAT and EORI (both required), a person's VAT and passport (optional). */
function TaxFields({ values, fe, type }: { values: ContactFormValues; fe: Errors; type: string }) {
  const isCompany = type === "company";
  const common = { values, errors: fe, className: "contents" };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextFields fields={VAT} {...common} required={isCompany} />
      {isCompany && <TextFields fields={EORI} {...common} required />}
      {type === "person" && <TextFields fields={PASSPORT} {...common} />}
    </div>
  );
}

/** A comma-separated list typed against a Settings list offered as the person types. */
function ListField({
  name,
  label,
  value,
  options,
  placeholder,
  fe,
  required,
}: {
  name: "professions" | "tags";
  label: string;
  value?: string | null;
  options: readonly string[];
  placeholder: string;
  fe: Errors;
  required?: boolean;
}) {
  return (
    <>
      <Field
        id={name}
        label={label}
        hint={`Comma-separated; the list in Settings › Contacts › ${name === "tags" ? "Contact tags" : "Professions"} is offered as you type.`}
        error={fe?.[name]}
        required={required}
      >
        <Input
          id={name}
          name={name}
          list={`${name}-list`}
          defaultValue={value ?? ""}
          placeholder={placeholder}
          required={required}
        />
      </Field>
      <datalist id={`${name}-list`}>
        {options.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  );
}

export function ContactForm({
  action,
  values = {},
  submitLabel,
  professions,
  tags,
  idFormats,
  countries,
  terms,
  salutations,
}: {
  action: Action;
  values?: ContactFormValues;
  submitLabel: string;
  /** The professions and tags lists (Settings › Lists), offered as the person types. */
  professions: readonly string[];
  tags: readonly string[];
  /** The VAT and EORI formats (Settings › Number formats), checked in the browser as on the server. */
  idFormats: readonly IdFormat[];
  /** The countries table (Settings › Countries), searched by name or code. */
  countries: readonly Country[];
  /** The payment terms (Settings › Accounting), offered as the customer's own. */
  terms: readonly { value: string; label: string }[];
  /** The salutations list (Settings › Lists). */
  salutations: readonly { value: string; label: string }[];
}) {
  const schema = useMemo(() => checkedContactSchema(idFormats), [idFormats]);
  const [state, formAction, pending] = useToastedAction(action, undefined, schema);
  const fe = !state.ok ? state.fieldErrors : undefined;
  // The type decides the fields: a location has its site and no tax numbers or billing.
  const [type, setType] = useState(values.type ?? "company");
  // The language follows the country picked (Settings › Countries) until it is chosen by hand.
  const [lang, setLang] = useState(values.lang ?? (values.id ? "en" : ""));
  const langByHand = useRef(false);
  // A country whose language the office does not write (China: Chinese) means English.
  const followCountry = (code: string | null) => {
    if (code && !langByHand.current) setLang(langOf(countries, code));
  };
  const isLocation = type === "location";

  return (
    <ActionForm action={formAction} className="grid gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.version && <input type="hidden" name="version" value={values.version} />}
      <SectionJumps hide={isLocation ? ["contact-tax", "contact-billing"] : ["contact-site"]} />
      <FormSection id="contact-identity">
        <IdentityFields
          values={values}
          fe={fe}
          type={type}
          onType={setType}
          lang={lang}
          onLang={(l) => {
            langByHand.current = true;
            setLang(l);
          }}
          salutations={salutations}
        />
      </FormSection>
      <FormSection id="contact-tax" hidden={isLocation}>
        <TaxFields values={values} fe={fe} type={type} />
      </FormSection>
      <FormSection id="contact-site" hidden={!isLocation}>
        <SiteFields values={values} fe={fe} />
      </FormSection>
      <FormSection id="contact-reach">
        <ReachFields values={values} fe={fe} isPerson={type === "person"} />
      </FormSection>
      <FormSection id="contact-address">
        <AddressFields values={values} fe={fe} countries={countries} onCountry={followCountry} />
      </FormSection>
      <FormSection id="contact-lists">
        <ListField
          name="professions"
          label="Professions"
          value={values.professions}
          options={professions}
          placeholder="Transporter, Used clothing"
          fe={fe}
          required={type === "company"}
        />
        <ListField
          name="tags"
          label="Tags"
          value={values.tags}
          options={tags}
          placeholder="B2B, Key account"
          fe={fe}
        />
      </FormSection>
      <FormSection id="contact-billing" hidden={isLocation}>
        <TextFields fields={CREDIT_FIELDS} values={values} errors={fe} />
        <PricingFields
          terms={terms}
          paymentTermId={values.paymentTermId}
          usesLastPrice={values.usesLastPrice}
          error={fe?.paymentTermId}
        />
      </FormSection>
      <Field id="note" label="Note" error={fe?.note}>
        <Textarea
          id="note"
          name="note"
          defaultValue={values.note ?? ""}
          rows={3}
          maxLength={5000}
        />
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

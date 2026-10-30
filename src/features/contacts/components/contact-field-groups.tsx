"use client";

import { CountryPicker } from "@/components/shared/country-picker";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/domain/contacts";
import type { Country } from "@/domain/countries";
import type { ContactFormValues } from "../form-values";
import { TextFields, type TextFieldSpec } from "./form-section";

/**
 * The field groups a contact is made of, shared by the contact's own form and the dialog that
 * adds or edits a linked person or location. `prefix` keeps a dialog's ids apart from the page's.
 */
export type Errors = Record<string, string[] | undefined> | undefined;
type Group = { values: ContactFormValues; fe: Errors; prefix?: string };

/** "French (FR)": the language's English name from the browser's own tables, and its code. */
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
const languageLabel = (code: string) => `${languageNames.of(code) ?? code} (${code.toUpperCase()})`;

export function LanguageSelect({
  lang,
  onLang,
  withByCountry,
  prefix = "",
}: {
  lang: string;
  onLang: (lang: string) => void;
  /** A new contact may leave it to the country (the server picks the country's language). */
  withByCountry: boolean;
  prefix?: string;
}) {
  return (
    <Field id={`${prefix}lang`} label="Language">
      <NativeSelect
        id={`${prefix}lang`}
        name="lang"
        value={lang}
        onChange={(e) => onLang(e.target.value)}
        options={[
          ...(withByCountry ? [{ value: "", label: "By country" }] : []),
          ...LANGUAGES.map((l) => ({ value: l, label: languageLabel(l) })),
        ]}
      />
    </Field>
  );
}

/** A person's salutation, first and last name and job title. */
export function PersonNameFields({
  values,
  fe,
  prefix = "",
  active,
  salutations,
}: Group & { active: boolean; salutations: readonly { value: string; label: string }[] }) {
  const id = (n: string) => `${prefix}${n}`;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
        <Field id={id("salutationId")} label="Salutation" error={fe?.salutationId}>
          <NativeSelect
            id={id("salutationId")}
            name="salutationId"
            defaultValue={values.salutationId ?? ""}
            placeholder="—"
            options={salutations}
          />
        </Field>
        <Field id={id("firstName")} label="First name" error={fe?.firstName}>
          <Input id={id("firstName")} name="firstName" defaultValue={values.firstName ?? ""} />
        </Field>
        <Field id={id("lastName")} label="Last name" error={fe?.lastName} required>
          <Input
            id={id("lastName")}
            name="lastName"
            defaultValue={values.lastName ?? ""}
            required={active}
          />
        </Field>
      </div>
      <Field id={id("jobTitle")} label="Job title" error={fe?.jobTitle}>
        <Input id={id("jobTitle")} name="jobTitle" defaultValue={values.jobTitle ?? ""} />
      </Field>
    </>
  );
}

const REACH = [
  ["email", "Email", "email"],
  ["phone", "Phone", "tel"],
  ["mobile", "Mobile", "tel"],
  ["whatsapp", "WhatsApp", "tel"],
  // Text, not "url": the browser would refuse "www.example.com" without its "https://".
  ["website", "Website", "text"],
] as const satisfies readonly TextFieldSpec[];

/** Email, phones and website; a person must give an email or a phone. */
export function ReachFields({ values, fe, prefix, isPerson }: Group & { isPerson: boolean }) {
  return (
    <>
      {isPerson && (
        <p className="text-xs text-muted-foreground">A person needs an email or a phone number.</p>
      )}
      <TextFields fields={REACH} values={values} errors={fe} prefix={prefix} />
    </>
  );
}

const STREET = [["street", "Street", "text"]] as const satisfies readonly TextFieldSpec[];
const ZIP = [["zip", "Postcode", "text"]] as const satisfies readonly TextFieldSpec[];
const CITY = [["city", "City", "text"]] as const satisfies readonly TextFieldSpec[];

/** Street, postcode, city and the searchable country; all but the postcode required. */
export function AddressFields({
  values,
  fe,
  prefix = "",
  countries,
  onCountry,
  compact,
}: Group & {
  countries: readonly Country[];
  onCountry?: (code: string | null) => void;
  /** In a dialog: two fields a row, never four. */
  compact?: boolean;
}) {
  const common = { values, errors: fe, prefix, className: "contents" };
  return (
    <div
      className={
        compact
          ? "grid gap-4 sm:grid-cols-2"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_1fr_16rem]"
      }
    >
      <TextFields fields={STREET} {...common} required />
      <TextFields fields={ZIP} {...common} />
      <TextFields fields={CITY} {...common} required />
      <Field id={`${prefix}country`} label="Country" error={fe?.country} required>
        <CountryPicker
          id={`${prefix}country`}
          name="country"
          countries={countries}
          defaultValue={values.country}
          onChange={onCountry}
          required
        />
      </Field>
    </div>
  );
}

const SITE_REF = [
  ["siteRef", "Reference / code", "text"],
] as const satisfies readonly TextFieldSpec[];
const HOURS = [
  ["openingHours", "Opening hours", "text"],
] as const satisfies readonly TextFieldSpec[];

/** A location's site: its code at the carrier or terminal, opening hours and instructions. */
export function SiteFields({ values, fe, prefix = "" }: Group) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextFields
          fields={SITE_REF}
          values={values}
          errors={fe}
          prefix={prefix}
          className="contents"
        />
        <TextFields
          fields={HOURS}
          values={values}
          errors={fe}
          prefix={prefix}
          className="contents"
        />
      </div>
      <Field
        id={`${prefix}instructions`}
        label="Instructions"
        hint="Loading, delivery or access remarks."
        error={fe?.instructions}
      >
        <Textarea
          id={`${prefix}instructions`}
          name="instructions"
          defaultValue={values.instructions ?? ""}
          rows={2}
          maxLength={2000}
        />
      </Field>
    </>
  );
}

"use client";

import { useState } from "react";
import { CityPicker } from "@/components/shared/city-picker";
import { CountryPicker } from "@/components/shared/country-picker";
import { PostcodeField, postcodesOfCity } from "@/components/shared/postcode-field";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/domain/contacts";
import type { Country } from "@/domain/countries";
import type { PostcodeOption } from "@/domain/postcodes";
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

/**
 * Street, the searchable country, its postcode and its city, picked from the country's lists;
 * all but the postcode required. Each change the person makes carries to the next field: a
 * postcode changed replaces the city with its own; a city changed replaces the postcode with its
 * only code, else clears it and offers its codes; a new country clears both. Loading a saved
 * address changes nothing.
 */
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
  const [country, setCountry] = useState(values.country ?? null);
  // The city shown: the record's, or the one a postcode filled in (a new `n` remounts the picker).
  const [city, setCity] = useState({ id: values.cityId ?? null, name: values.city ?? null, n: 0 });
  // The postcode likewise: the record's, or the one a city filled in, with the codes it offers.
  const [zip, setZip] = useState({
    value: values.zip ?? "",
    offered: [] as PostcodeOption[],
    n: 0,
  });
  // A city picked by the person replaces the postcode: its only code, else none and its codes offered.
  // The field also answers on blur: only a city that changed moves the postcode.
  const cityPicked = async (id: string | null) => {
    if (id === city.id) return;
    setCity((c) => ({ ...c, id }));
    if (!country) return;
    const codes = id ? await postcodesOfCity(country, id) : [];
    setZip((z) => ({ value: codes.length === 1 ? codes[0].code : "", offered: codes, n: z.n + 1 }));
  };
  return (
    <div
      className={
        compact
          ? "grid gap-4 sm:grid-cols-2"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_16rem_8rem_1fr]"
      }
    >
      <TextFields fields={STREET} {...common} required />
      <Field id={`${prefix}country`} label="Country" error={fe?.country} required>
        <CountryPicker
          id={`${prefix}country`}
          name="country"
          countries={countries}
          defaultValue={values.country}
          onChange={(code) => {
            setCountry(code);
            if (code !== country) {
              setCity((c) => ({ id: null, name: null, n: c.n + 1 }));
              setZip((z) => ({ value: "", offered: [], n: z.n + 1 }));
            }
            onCountry?.(code);
          }}
          required
        />
      </Field>
      <Field id={`${prefix}zip`} label="Postcode" error={fe?.zip}>
        <PostcodeField
          key={zip.n}
          id={`${prefix}zip`}
          name="zip"
          country={country}
          cityId={city.id}
          defaultValue={zip.value}
          offered={zip.offered}
          onValue={(value) => setZip((z) => ({ ...z, value }))}
          onCity={(c) => c.id !== city.id && setCity((was) => ({ ...c, n: was.n + 1 }))}
        />
      </Field>
      <Field id={`${prefix}cityId`} label="City" error={fe?.cityId} required>
        <CityPicker
          key={city.n}
          id={`${prefix}cityId`}
          name="cityId"
          country={country}
          defaultValue={city.id}
          defaultLabel={city.name}
          onChange={(id) => void cityPicked(id)}
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

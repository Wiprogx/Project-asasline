"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { CONTACT_TYPES } from "@/domain/contacts";
import type { ContactFormValues } from "../form-values";
import { type Errors, LanguageSelect, PersonNameFields } from "./contact-field-groups";

const TYPE_LABEL = { company: "Company", person: "Person", location: "Location" } as const;

/**
 * Who the contact is: its type first (it decides the rest), the language written to it, then a
 * company's or a location's name, or a person's names.
 */
export function IdentityFields({
  values,
  fe,
  type,
  onType,
  salutations,
  lang,
  onLang,
}: {
  values: ContactFormValues;
  fe: Errors;
  type: string;
  onType: (type: string) => void;
  salutations: readonly { value: string; label: string }[];
  /** The language, which follows the country until it is picked here by hand. */
  lang: string;
  onLang: (lang: string) => void;
}) {
  const isPerson = type === "person";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="type" label="Type">
          <NativeSelect
            id="type"
            name="type"
            value={type}
            onChange={(e) => onType(e.target.value)}
            options={CONTACT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
          />
        </Field>
        <LanguageSelect lang={lang} onLang={onLang} withByCountry={!values.id} />
      </div>
      {isPerson ? (
        <PersonNameFields values={values} fe={fe} active salutations={salutations} />
      ) : (
        <Field id="name" label="Name" error={fe?.name} required>
          <Input id="name" name="name" defaultValue={values.name ?? ""} required />
        </Field>
      )}
    </>
  );
}

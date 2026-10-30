"use client";

import { type ReactNode, useRef, useState } from "react";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type Country, langOf } from "@/domain/countries";
import type { ContactFormValues } from "../form-values";
import {
  AddressFields,
  type Errors,
  LanguageSelect,
  PersonNameFields,
  ReachFields,
  SiteFields,
} from "./contact-field-groups";

/** The role the linked contact has here; one no longer offered still shows, so a save keeps it. */
export function RoleSelect({
  id,
  roles,
  role,
  fe,
}: {
  id: string;
  roles: readonly { value: string; label: string }[];
  /** The link's own role, by id and words. */
  role?: { id: string; label: string };
  fe: Errors;
}) {
  const options =
    role && !roles.some((r) => r.value === role.id)
      ? [{ value: role.id, label: `${role.label} (archived)` }, ...roles]
      : roles;
  return (
    <Field id={id} label="Role" error={fe?.roleId} required>
      <NativeSelect
        id={id}
        name="roleId"
        required
        defaultValue={role?.id ?? ""}
        placeholder="Pick a role…"
        options={options}
      />
    </Field>
  );
}

/**
 * A person's or a location's own fields in a dialog, in two columns so it fits the screen:
 * who it is and how to reach it on the left; its address, language, site and note on the right.
 * The type posts with the form, so the server checks it as that kind of contact.
 */
export function LinkedFields({
  type,
  values,
  fe,
  prefix,
  salutations,
  countries,
  children,
}: {
  /** Shown first in the left column (the link's role). */
  children?: ReactNode;
  type: "person" | "location";
  values: ContactFormValues;
  fe: Errors;
  prefix: string;
  salutations: readonly { value: string; label: string }[];
  countries: readonly Country[];
}) {
  const [lang, setLang] = useState(values.lang ?? "en");
  const byHand = useRef(false);
  const isPerson = type === "person";
  const group = { values, fe, prefix };
  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 md:items-start">
      <div className="grid gap-4">
        <input type="hidden" name="type" value={type} />
        {children}
        {isPerson ? (
          <PersonNameFields {...group} active salutations={salutations} />
        ) : (
          <Field id={`${prefix}name`} label="Name" error={fe?.name} required>
            <Input
              id={`${prefix}name`}
              name="name"
              defaultValue={values.name ?? ""}
              placeholder="Warehouse Zeebrugge"
              required
            />
          </Field>
        )}
        <ReachFields {...group} isPerson={isPerson} />
      </div>
      <div className="grid gap-4">
        <AddressFields
          {...group}
          countries={countries}
          compact
          onCountry={(code) => {
            if (code && !byHand.current) setLang(langOf(countries, code));
          }}
        />
        <LanguageSelect
          prefix={prefix}
          lang={lang}
          onLang={(l) => {
            byHand.current = true;
            setLang(l);
          }}
          withByCountry={false}
        />
        {!isPerson && <SiteFields {...group} />}
        <Field id={`${prefix}note`} label="Note">
          <Textarea id={`${prefix}note`} name="note" defaultValue={values.note ?? ""} rows={2} />
        </Field>
      </div>
    </div>
  );
}

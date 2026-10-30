"use client";

import { useState } from "react";
import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { type PickerOption, SearchPicker } from "@/components/shared/search-picker";
import { NativeSelect } from "@/components/shared/native-select";
import type { Country } from "@/domain/countries";
import type { ContactFormValues } from "../form-values";
import { addLinked, updateLinked } from "../link-actions";
import type { LinkedContact } from "../link-queries";
import type { Errors } from "./contact-field-groups";
import { LinkedFields, RoleSelect } from "./linked-fields";

export type LinkKind = "person" | "location" | "company";
const NOUN = { person: "person", location: "location", company: "company" } as const;

export type LinkContext = {
  contactId: string;
  /** The page's contact: a new person starts at its address, in its language. */
  parent: ContactFormValues;
  roles: Record<LinkKind, readonly { value: string; label: string }[]>;
  salutations: readonly { value: string; label: string }[];
  countries: readonly Country[];
  /** Live contacts by type, for "an existing one". */
  candidates: Record<LinkKind, readonly PickerOption[]>;
};

const KIND_LABEL: Record<LinkKind, string> = {
  person: "Person",
  location: "Location",
  company: "Company",
};

/** A choice that shapes the dialog (what to add, new or existing); it is not posted itself. */
function Choice<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Field id={id} label={label}>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        options={options}
      />
    </Field>
  );
}

/** A new person starts at the page contact's address, in its language; a new location blank. */
function startOf(kind: "person" | "location", parent: ContactFormValues): ContactFormValues {
  if (kind === "location") return {};
  const { street, zip, city, country, lang } = parent;
  return { street, zip, city, country, lang };
}

/**
 * The add dialog: what it is (a person, a location — or, seen from one of those, a company),
 * new or already a contact, its role here; a new one gets the same full form as Edit.
 */
function AddBody({ kinds, ctx, fe }: { kinds: readonly LinkKind[]; ctx: LinkContext; fe: Errors }) {
  const [kind, setKind] = useState<LinkKind>(kinds[0]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const existing = mode === "existing" || kind === "company";
  const prefix = `add-${kind}-`;
  const role = (
    <RoleSelect key={`role-${kind}`} id={`${prefix}role`} roles={ctx.roles[kind]} fe={fe} />
  );
  return (
    <>
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <Choice
          id="add-kind"
          label="Type"
          options={kinds.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
          value={kind}
          onChange={setKind}
        />
        {kind !== "company" && (
          <Choice
            id="add-mode"
            label="New or existing"
            options={[
              { value: "new", label: `New ${NOUN[kind]}` },
              { value: "existing", label: `Existing ${NOUN[kind]}` },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}
      </div>
      {existing ? (
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 md:items-start">
          {role}
          <Field id={`${prefix}linkedId`} label={`The ${NOUN[kind]}`} error={fe?.linkedId} required>
            <SearchPicker
              key={`pick-${kind}`}
              id={`${prefix}linkedId`}
              name="linkedId"
              options={ctx.candidates[kind].filter((o) => o.value !== ctx.contactId)}
              placeholder={`Search a ${NOUN[kind]} by name`}
              empty={`No ${NOUN[kind]} matches.`}
              required
            />
          </Field>
        </div>
      ) : (
        <LinkedFields
          key={`fields-${kind}`}
          type={kind}
          values={startOf(kind, ctx.parent)}
          fe={fe}
          prefix={prefix}
          salutations={ctx.salutations}
          countries={ctx.countries}
        >
          {role}
        </LinkedFields>
      )}
    </>
  );
}

/** "+ Add": one button for every related contact; the type is picked in the dialog. */
export function AddLinkedDialog({ kinds, ctx }: { kinds: readonly LinkKind[]; ctx: LinkContext }) {
  return (
    <FormDialog
      action={addLinked}
      hidden={{ contactId: ctx.contactId }}
      trigger="+ Add"
      title="Add a related contact"
      description="It is a contact of its own, in the contacts list, linked here with its role."
      submitLabel="Add"
      size="xl"
    >
      {(fe) => <AddBody kinds={kinds} ctx={ctx} fe={fe} />}
    </FormDialog>
  );
}

/** A linked person or location corrected in a dialog: its role here and its own fields. */
export function EditLinkedDialog({
  link,
  ctx,
}: {
  link: LinkedContact & { other: { type: "person" | "location" } };
  ctx: LinkContext;
}) {
  const o = link.other;
  return (
    <FormDialog
      action={updateLinked}
      hidden={{
        contactId: ctx.contactId,
        linkId: link.linkId,
        linkVersion: link.linkVersion,
        linkedId: o.id,
        linkedVersion: o.version,
      }}
      trigger="Edit"
      title={`Edit — ${o.name}`}
      description="Saved on the contact itself: every contact it is linked to sees the change."
      submitLabel="Save"
      size="xl"
    >
      {(fe) => (
        <LinkedFields
          type={o.type}
          values={o}
          fe={fe}
          prefix={`ed-${link.linkId}-`}
          salutations={ctx.salutations}
          countries={ctx.countries}
        >
          <RoleSelect
            id={`ed-${link.linkId}-role`}
            roles={ctx.roles[o.type]}
            role={{ id: link.roleId, label: link.role }}
            fe={fe}
          />
        </LinkedFields>
      )}
    </FormDialog>
  );
}

"use client";

import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/domain/contacts";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import type { UserRow } from "../queries";

type Errors = Record<string, string[] | undefined> | undefined;

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
const LANG_OPTIONS = LANGUAGES.map((l) => ({
  value: l,
  label: `${languageNames.of(l) ?? l} (${l.toUpperCase()})`,
}));
const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

/**
 * A user's own fields, in two columns: who they are and their role on the left; their job
 * title, language and the signature under their e-mails on the right.
 */
export function UserFields({
  prefix,
  user,
  fe,
  roleLocked,
}: {
  prefix: string;
  user?: Partial<UserRow>;
  fe: Errors;
  /** Their own role: another Admin changes it. */
  roleLocked?: boolean;
}) {
  const id = (n: string) => `${prefix}${n}`;
  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 md:items-start">
      <div className="grid gap-4">
        <Field id={id("name")} label="Full name" error={fe?.name} required>
          <Input
            id={id("name")}
            name="name"
            defaultValue={user?.name ?? ""}
            autoComplete="off"
            required
          />
        </Field>
        <Field
          id={id("email")}
          label="Email"
          hint="They sign in with it."
          error={fe?.email}
          required
        >
          <Input
            id={id("email")}
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            autoComplete="off"
            required
          />
        </Field>
        <Field
          id={id("role")}
          label="Role"
          hint={
            roleLocked ? "Ask another Admin to change your own role." : "What they may open and do."
          }
          error={fe?.role}
          required
        >
          <NativeSelect
            id={id("role")}
            name="role"
            defaultValue={user?.role ?? "docs_clerk"}
            options={ROLE_OPTIONS}
            disabled={roleLocked}
          />
        </Field>
        {roleLocked && <input type="hidden" name="role" value={user?.role} />}
      </div>
      <div className="grid gap-4">
        <Field id={id("jobTitle")} label="Job title" error={fe?.jobTitle}>
          <Input
            id={id("jobTitle")}
            name="jobTitle"
            defaultValue={user?.jobTitle ?? ""}
            placeholder="Operations"
          />
        </Field>
        <Field id={id("lang")} label="Language" error={fe?.lang}>
          <NativeSelect
            id={id("lang")}
            name="lang"
            defaultValue={user?.lang ?? "en"}
            options={LANG_OPTIONS}
          />
        </Field>
        <Field
          id={id("signature")}
          label="Email signature"
          hint="Added under the e-mails they send from Discuss and the quotations."
          error={fe?.signature}
        >
          <Textarea
            id={id("signature")}
            name="signature"
            defaultValue={user?.signature ?? ""}
            rows={4}
          />
        </Field>
      </div>
    </div>
  );
}

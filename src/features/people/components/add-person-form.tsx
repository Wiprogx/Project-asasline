"use client";

import { useActionState, useRef } from "react";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/domain/people";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import { useActionToast } from "@/hooks/use-action-toast";
import { IDLE } from "@/lib/action-result";
import { addPerson } from "../actions";

export function AddPersonForm() {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addPerson, IDLE);
  useActionToast(state, () => form.current?.reset());
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <form
      ref={form}
      action={action}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-start"
    >
      <Field id="p-name" label="Name" error={fe?.name}>
        <Input id="p-name" name="name" required />
      </Field>
      <Field id="p-email" label="Email" error={fe?.email}>
        <Input id="p-email" name="email" type="email" required autoComplete="off" />
      </Field>
      <Field id="p-role" label="Role">
        <NativeSelect
          id="p-role"
          name="role"
          defaultValue="docs_clerk"
          options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
        />
      </Field>
      <Field
        id="p-password"
        label="First password"
        error={fe?.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters; tell them by phone`}
      >
        <Input
          id="p-password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add person"}
        </Button>
      </div>
    </form>
  );
}

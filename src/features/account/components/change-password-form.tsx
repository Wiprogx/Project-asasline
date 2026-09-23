"use client";

import { useActionState, useRef } from "react";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/domain/people";
import { useActionToast } from "@/hooks/use-action-toast";
import { IDLE } from "@/lib/action-result";
import { changePassword } from "../actions";

export function ChangePasswordForm() {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(changePassword, IDLE);
  useActionToast(state, () => form.current?.reset());
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={form} action={action} className="grid max-w-sm gap-4">
      <Field id="current" label="Current password" error={fe?.current}>
        <Input
          id="current"
          name="current"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>
      <Field
        id="next"
        label="New password"
        error={fe?.next}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
      >
        <Input
          id="next"
          name="next"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
      </Field>
      <Field id="confirm" label="New password again" error={fe?.confirm}>
        <Input id="confirm" name="confirm" type="password" required autoComplete="new-password" />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

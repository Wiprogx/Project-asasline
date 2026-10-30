"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/action-result";
import { requestReset, resetPassword, setOwnPassword } from "../password-actions";

type Errors = Record<string, string[] | undefined> | undefined;

/** The new password twice; a password manager may fill and keep it. */
function NewPasswordFields({ fe }: { fe: Errors }) {
  return (
    <>
      <Field id="next" label="New password" hint="At least 10 characters." error={fe?.next}>
        <Input id="next" name="next" type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirm" label="The same again" error={fe?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
    </>
  );
}

function Refusal({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : null;
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, IDLE);
  if (state.ok)
    return (
      <div className="grid gap-4 text-sm">
        <p role="status">{state.message}</p>
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <ActionForm action={action} className="grid gap-4">
      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Refusal error={state.error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send me a link"}
      </Button>
      <Link href="/login" className="text-center text-sm text-muted-foreground hover:underline">
        Back to sign in
      </Link>
    </ActionForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, IDLE);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <NewPasswordFields fe={fe} />
      <Refusal error={!state.ok ? state.error : undefined} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save my new password"}
      </Button>
    </ActionForm>
  );
}

export function OwnPasswordForm() {
  const [state, action, pending] = useActionState(setOwnPassword, IDLE);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm action={action} className="grid gap-4">
      <NewPasswordFields fe={fe} />
      <Refusal error={!state.ok ? state.error : undefined} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </ActionForm>
  );
}

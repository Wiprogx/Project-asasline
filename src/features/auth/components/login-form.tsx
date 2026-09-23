"use client";

import { ActionForm } from "@/components/shared/action-form";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE } from "@/lib/action-result";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, IDLE);
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <ActionForm action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
        {fe?.email && <p className="text-sm text-destructive">{fe.email[0]}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {!state.ok && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </ActionForm>
  );
}

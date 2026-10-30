"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { addUser, updateUser } from "../actions";
import type { UserRow } from "../queries";
import { newUserSchema } from "../schemas";
import { SecretReveal } from "./secret-reveal";
import { UserFields } from "./user-fields";

/**
 * "+ Add user": their fields and a temporary password — typed, or left empty to make one up,
 * shown once when saved. They choose their own at the first sign-in.
 */
export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const [state, run, pending] = useToastedAction(
    addUser,
    (data) => (data?.password ? setMade(data.password) : setOpen(false)),
    newUserSchema,
  );
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMade(null);
      }}
    >
      <DialogTrigger render={<Button />}>+ Add user</DialogTrigger>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            They sign in with this email and a temporary password, then choose their own.
          </DialogDescription>
        </DialogHeader>
        {made ? (
          <>
            <SecretReveal
              label="Their temporary password"
              value={made}
              note="Shown once. Give it by phone, not by e-mail."
            />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <ActionForm action={run} className="grid gap-4">
            <UserFields prefix="new-" fe={fe} />
            <Field
              id="new-password"
              label="Temporary password"
              hint="Leave empty and one is made up for you, shown once."
              error={fe?.password}
            >
              <Input id="new-password" name="password" type="text" autoComplete="off" />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add user"}
              </Button>
            </DialogFooter>
          </ActionForm>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Their fields corrected; a colleague's newer save is refused, never overwritten. */
export function EditUserDialog({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  return (
    <FormDialog
      action={updateUser}
      hidden={{ id: user.id, version: user.version }}
      trigger="Edit"
      title={`Edit — ${user.name}`}
      submitLabel="Save"
      size="xl"
    >
      {(fe) => <UserFields prefix={`ed-${user.id}-`} user={user} fe={fe} roleLocked={isSelf} />}
    </FormDialog>
  );
}

"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToastedAction } from "@/hooks/use-action-toast";
import { sendResetLink, setTemporaryPassword } from "../password-actions";
import { tempPasswordSchema } from "../schemas";
import { SecretReveal } from "./secret-reveal";

type Shown = { label: string; value: string; note: string } | null;

/**
 * Reset a user's password, two ways: a one-time link by e-mail (they choose the new one), or a
 * temporary password (signed out at once, they choose their own at the next sign-in).
 */
export function PasswordDialog({ id, name, email }: { id: string; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Shown>(null);
  const [, sendLink, linkPending] = useToastedAction(sendResetLink, (d) =>
    d?.link
      ? setShown({ label: "Their reset link", value: d.link, note: "Works once, for one hour." })
      : setOpen(false),
  );
  const [tempState, setTemp, tempPending] = useToastedAction(
    setTemporaryPassword,
    (d) =>
      d?.password
        ? setShown({
            label: "Their temporary password",
            value: d.password,
            note: "Shown once. Give it by phone, not by e-mail.",
          })
        : setOpen(false),
    tempPasswordSchema,
  );
  const fe = !tempState.ok ? tempState.fieldErrors : undefined;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setShown(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Password</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reset the password — {name}</DialogTitle>
          <DialogDescription>
            Their current password stops working once a new one is set.
          </DialogDescription>
        </DialogHeader>
        {shown ? (
          <SecretReveal {...shown} />
        ) : (
          <div className="grid gap-5">
            <ActionForm action={sendLink} className="grid gap-2">
              <input type="hidden" name="id" value={id} />
              <h3 className="text-sm font-medium">Send a reset link</h3>
              <p className="text-xs text-muted-foreground">
                To {email}: they open it and choose a new password (one hour, once).
              </p>
              <div>
                <Button type="submit" variant="outline" disabled={linkPending}>
                  {linkPending ? "Sending…" : "Send the link"}
                </Button>
              </div>
            </ActionForm>
            <ActionForm action={setTemp} className="grid gap-2 border-t pt-4">
              <input type="hidden" name="id" value={id} />
              <h3 className="text-sm font-medium">Set a temporary password</h3>
              <p className="text-xs text-muted-foreground">
                They are signed out everywhere and choose their own at the next sign-in.
              </p>
              <Field
                id={`tp-${id}`}
                label="Temporary password"
                hint="Leave empty and one is made up, shown once."
                error={fe?.password}
              >
                <Input id={`tp-${id}`} name="password" type="text" autoComplete="off" />
              </Field>
              <div>
                <Button type="submit" disabled={tempPending}>
                  {tempPending ? "Setting…" : "Set it and sign them out"}
                </Button>
              </div>
            </ActionForm>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CHANNEL_LABEL, type Route } from "@/domain/messages";
import { useToastedAction } from "@/hooks/use-action-toast";
import { logIncoming } from "../actions";

type Option = { id: string; name: string };

/**
 * Log a message that reached the office another way (the mail client, the phone). Logged, it
 * is routed to a role, waits in that queue until someone takes it, and stays on its file.
 */
export function LogIncomingDialog({
  contacts,
  routes,
  linkRef,
}: {
  contacts: Option[];
  routes: Route[];
  linkRef?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(logIncoming, () => setOpen(false));
  const fe = !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Log a message received
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <ActionForm action={run} className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Log a message received</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="in-channel" label="Came by">
              <NativeSelect
                id="in-channel"
                name="channel"
                defaultValue="email"
                options={(["email", "whatsapp", "call", "web"] as const).map((c) => ({
                  value: c,
                  label: CHANNEL_LABEL[c],
                }))}
              />
            </Field>
            <Field id="in-topic" label="About">
              <NativeSelect
                id="in-topic"
                name="topic"
                placeholder="— from the file —"
                options={routes
                  .filter((r) => r.active)
                  .map((r) => ({ value: r.code, label: r.subject }))}
              />
            </Field>
            <Field id="in-from" label="From (name, e-mail or phone)" error={fe?.fromText}>
              <Input id="in-from" name="fromText" required />
            </Field>
            <Field id="in-contact" label="Contact">
              <NativeSelect
                id="in-contact"
                name="contactId"
                placeholder="— not a known contact —"
                options={contacts.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field id="in-ref" label="Booking or quotation no." error={fe?.linkRef}>
              <Input
                id="in-ref"
                name="linkRef"
                defaultValue={linkRef}
                placeholder="SB2609001"
                className="font-mono uppercase"
              />
            </Field>
            <Field id="in-outcome" label="Call outcome">
              <NativeSelect
                id="in-outcome"
                name="callOutcome"
                placeholder="— not a call —"
                options={[
                  { value: "answered", label: "Answered" },
                  { value: "missed", label: "Missed" },
                  { value: "voicemail", label: "Voicemail" },
                ]}
              />
            </Field>
          </div>
          <Field id="in-subject" label="Subject">
            <Input id="in-subject" name="subject" />
          </Field>
          <Field id="in-body" label="Message">
            <Textarea id="in-body" name="body" rows={4} />
          </Field>
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Log it
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

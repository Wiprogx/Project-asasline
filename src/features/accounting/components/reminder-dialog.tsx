"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
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
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import { writeReminder } from "../reminder-actions";

/** The reminder due, written out to be read and changed before it is recorded and opened. */
export function ReminderDialog(p: {
  id: string;
  stepName: string;
  number: string;
  to: string;
  subject: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useToastedAction(writeReminder, (data) => {
    if (data?.href) window.open(data.href, "_blank", "noopener");
    setOpen(false);
  });
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{p.stepName}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <ActionForm action={run} className="grid gap-3">
          <DialogHeader>
            <DialogTitle>
              {p.stepName} — {p.number}
            </DialogTitle>
            <DialogDescription>
              Recorded in the messages, then opened in your mail app to send.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="id" value={p.id} />
          <Field id={`rm-to-${p.id}`} label="To" error={fe?.toText}>
            <Input id={`rm-to-${p.id}`} name="toText" defaultValue={p.to} required />
          </Field>
          <Field id={`rm-s-${p.id}`} label="Subject" error={fe?.subject}>
            <Input id={`rm-s-${p.id}`} name="subject" defaultValue={p.subject} required />
          </Field>
          <Field id={`rm-b-${p.id}`} label="Message" error={fe?.body}>
            <Textarea id={`rm-b-${p.id}`} name="body" rows={12} defaultValue={p.body} required />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Recording…" : "Record and open"}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

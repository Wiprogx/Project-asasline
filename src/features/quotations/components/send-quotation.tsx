"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
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
import { sendQuotation } from "../send-actions";

type Channel = "email" | "whatsapp";

/**
 * The quotation's letter, filled from the template, read and changed before it is recorded
 * and opened in the person's mail app or WhatsApp. Nothing leaves without being read first.
 */
export function SendQuotation(p: {
  quotationId: string;
  version: number;
  refLabel: string;
  sent: boolean;
  letter: { subject: string; body: string; email: string | null; whatsapp: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>(
    p.letter.email || !p.letter.whatsapp ? "email" : "whatsapp",
  );
  const [state, run, pending] = useToastedAction(sendQuotation, (data) => {
    if (data?.href) window.open(data.href, "_blank", "noopener");
    setOpen(false);
  });
  const fe = !state.ok ? state.fieldErrors : undefined;
  const to = channel === "email" ? p.letter.email : p.letter.whatsapp;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={p.sent ? "outline" : "default"} />}>
        {p.sent ? "Send again" : "Send"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <ActionForm action={run} className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Send {p.refLabel}</DialogTitle>
            <DialogDescription>
              Recorded on the quotation, then opened in your mail app or WhatsApp to send. A
              follow-up for tomorrow asks whether the customer agrees.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="quotationId" value={p.quotationId} />
          <input type="hidden" name="version" value={p.version} />
          <Field id="sq-channel" label="By" error={fe?.channel}>
            <NativeSelect
              id="sq-channel"
              name="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              options={[
                { value: "email", label: "E-mail" },
                { value: "whatsapp", label: "WhatsApp" },
              ]}
            />
          </Field>
          <Field id="sq-to" label="To" error={fe?.toText}>
            <Input id="sq-to" key={channel} name="toText" defaultValue={to ?? ""} required />
          </Field>
          <Field id="sq-subject" label="Subject" error={fe?.subject}>
            <Input id="sq-subject" name="subject" defaultValue={p.letter.subject} required />
          </Field>
          <Field id="sq-body" label="Message" error={fe?.body}>
            <Textarea id="sq-body" name="body" rows={14} defaultValue={p.letter.body} required />
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

"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Inbox } from "@/domain/templates";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveInbox } from "../routing-actions";

/** Where files arrive, and the signature under every letter (legacy INBOX). */
export function InboxForm({ inbox, version }: { inbox: Inbox; version: number }) {
  const [, run, pending] = useToastedAction(saveInbox);
  return (
    <ActionForm action={run} className="grid gap-3" key={version}>
      <input type="hidden" name="version" value={version} />
      <Field id="ib-address" label="Address files arrive at" hint="Reading it needs a mail server.">
        <Input id="ib-address" name="address" type="email" defaultValue={inbox.address} />
      </Field>
      <Field
        id="ib-signature"
        label="Signature"
        hint="Under every letter the office writes; {me} is the person writing."
      >
        <Textarea id="ib-signature" name="signature" rows={3} defaultValue={inbox.signature} />
      </Field>
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save inbox and signature"}
        </Button>
      </div>
    </ActionForm>
  );
}

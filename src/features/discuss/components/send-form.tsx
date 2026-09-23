"use client";

import { useRef, useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToastedAction } from "@/hooks/use-action-toast";
import { sendMessage } from "../actions";

export type Recipient = {
  id: string;
  label: string;
  email: string | null;
  whatsapp: string | null;
};

/**
 * Write to a party on the file. The message is recorded with its subject key
 * ([SB2609001/MSG]) so the reply finds its way back, then opened in the mail or WhatsApp app.
 */
export function SendForm({ linkRef, recipients }: { linkRef: string; recipients: Recipient[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [to, setTo] = useState("");
  const [contactId, setContactId] = useState("");
  const [state, run, pending] = useToastedAction(sendMessage, (data) => {
    if (data?.href) window.open(data.href, "_blank", "noopener");
    form.current?.reset();
    setTo("");
    setContactId("");
  });
  const fe = !state.ok ? state.fieldErrors : undefined;

  const pick = (id: string) => {
    setContactId(id);
    const r = recipients.find((x) => x.id === id);
    if (r) setTo((channel === "email" ? r.email : r.whatsapp) ?? "");
  };

  return (
    <ActionForm ref={form} action={run} className="grid gap-3">
      <input type="hidden" name="linkRef" value={linkRef} />
      <input type="hidden" name="contactId" value={contactId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="s-channel" label="By">
          <NativeSelect
            id="s-channel"
            name="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as "email" | "whatsapp")}
            options={[
              { value: "email", label: "E-mail" },
              { value: "whatsapp", label: "WhatsApp" },
            ]}
          />
        </Field>
        <Field id="s-party" label="To a party on the file">
          <NativeSelect
            id="s-party"
            value={contactId}
            onChange={(e) => pick(e.target.value)}
            placeholder="— choose —"
            options={recipients.map((r) => ({ value: r.id, label: r.label }))}
          />
        </Field>
        <Field
          id="s-to"
          label={channel === "email" ? "E-mail address" : "WhatsApp number"}
          error={fe?.toText}
        >
          <Input
            id="s-to"
            name="toText"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      {channel === "email" && (
        <Field
          id="s-subject"
          label="Subject"
          hint={`The key [${linkRef}/MSG] is added so the reply comes back here`}
        >
          <Input id="s-subject" name="subject" />
        </Field>
      )}
      <Field id="s-body" label="Message" error={fe?.body}>
        <Textarea id="s-body" name="body" rows={4} required />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Recording…" : "Record and open to send"}
        </Button>
      </div>
    </ActionForm>
  );
}

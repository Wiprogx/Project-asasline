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
export type FilledTemplate = {
  code: string;
  name: string;
  channel: "email" | "whatsapp" | "both";
  subject: string;
  body: string;
};

export function SendForm({
  linkRef,
  recipients,
  templates = [],
}: {
  linkRef: string;
  recipients: Recipient[];
  templates?: FilledTemplate[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [to, setTo] = useState("");
  const [contactId, setContactId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("");
  const [state, run, pending] = useToastedAction(sendMessage, (data) => {
    if (data?.href) window.open(data.href, "_blank", "noopener");
    form.current?.reset();
    setTo("");
    setContactId("");
    setSubject("");
    setBody("");
    setTemplate("");
  });

  // A template writes the subject and the text, filled from the file; they stay editable.
  const applyTemplate = (code: string) => {
    setTemplate(code);
    const t = templates.find((x) => x.code === code);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    if (t.channel !== "both" && t.channel !== channel) setChannel(t.channel);
  };
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
      {templates.length > 0 && (
        <Field id="s-template" label="Template">
          <NativeSelect
            id="s-template"
            value={template}
            onChange={(e) => applyTemplate(e.target.value)}
            placeholder="— write it yourself —"
            options={templates.map((t) => ({ value: t.code, label: t.name }))}
          />
        </Field>
      )}
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
          <Input
            id="s-subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
      )}
      <Field id="s-body" label="Message" error={fe?.body}>
        <Textarea
          id="s-body"
          name="body"
          rows={template ? 10 : 4}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Recording…" : "Record and open to send"}
        </Button>
      </div>
    </ActionForm>
  );
}

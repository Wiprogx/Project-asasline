"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { placeholdersOf, type Template } from "@/domain/templates";
import { useToastedAction } from "@/hooks/use-action-toast";
import { saveTemplate } from "../template-actions";

const CHANNELS = [
  { value: "both", label: "E-mail or WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
];

/** One template: its name, how it goes out, the subject and the text with {placeholders}. */
export function TemplateEditor({ t, version }: { t?: Template; version: number }) {
  const [state, run, pending] = useToastedAction(saveTemplate);
  const fe = !state.ok ? state.fieldErrors : undefined;
  const id = t?.code ?? "new";
  return (
    <ActionForm action={run} className="grid gap-2 rounded-lg border p-3" key={`${id}-${version}`}>
      <input type="hidden" name="version" value={version} />
      {t ? (
        <input type="hidden" name="code" value={t.code} />
      ) : (
        <>
          <input type="hidden" name="fresh" value="1" />
          <Field id="tp-new-code" label="Code" error={fe?.code}>
            <Input id="tp-new-code" name="code" placeholder="ARRIVAL_NOTICE" />
          </Field>
        </>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <Field id={`tp-${id}-name`} label="Name" error={fe?.name}>
          <Input id={`tp-${id}-name`} name="name" defaultValue={t?.name} />
        </Field>
        <Field id={`tp-${id}-channel`} label="Goes by">
          <NativeSelect
            id={`tp-${id}-channel`}
            name="channel"
            defaultValue={t?.channel ?? "both"}
            options={CHANNELS}
          />
        </Field>
        {t && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={t.active} className="size-4" />
            In use
          </label>
        )}
      </div>
      <Field id={`tp-${id}-subject`} label="Subject" error={fe?.subject}>
        <Input id={`tp-${id}-subject`} name="subject" defaultValue={t?.subject} />
      </Field>
      <Field
        id={`tp-${id}-body`}
        label="Text"
        error={fe?.body}
        hint={
          t
            ? `Uses ${
                placeholdersOf(t.subject + t.body)
                  .map((p) => `{${p}}`)
                  .join(" ") || "no placeholder"
              }`
            : "Placeholders: {client} {ref} {dest} {containers} {vessel} {voyage} {etd} {eta} {docName} {customs} {portcut} {me}"
        }
      >
        <Textarea id={`tp-${id}-body`} name="body" rows={6} defaultValue={t?.body} />
      </Field>
      <div>
        <Button type="submit" variant={t ? "outline" : "default"} disabled={pending}>
          {t ? "Save" : "Add template"}
        </Button>
      </div>
    </ActionForm>
  );
}

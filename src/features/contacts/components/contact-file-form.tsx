"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLOWED_TYPES } from "@/domain/files";
import { useToastedAction } from "@/hooks/use-action-toast";
import { attachContactFile } from "../file-actions";

/** Keep a paper on the contact: what kind it is (Settings › Lists), the file, a note. */
export function ContactFileForm({ contactId, kinds }: { contactId: string; kinds: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [, run, pending] = useToastedAction(attachContactFile, () => form.current?.reset());
  return (
    <ActionForm
      ref={form}
      action={run}
      className="grid gap-3 sm:grid-cols-[12rem_1fr_1fr_auto] sm:items-end"
    >
      <input type="hidden" name="contactId" value={contactId} />
      <Field id="cf-kind" label="Kind of paper">
        <NativeSelect
          id="cf-kind"
          name="kind"
          required
          defaultValue={kinds[0]}
          options={kinds.map((k) => ({ value: k, label: k }))}
        />
      </Field>
      <Field id="cf-file" label="File">
        <Input
          id="cf-file"
          name="file"
          type="file"
          required
          accept={Object.keys(ALLOWED_TYPES).join(",")}
        />
      </Field>
      <Field id="cf-note" label="Note">
        <Input id="cf-note" name="note" placeholder="Signed 2026-02-06" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Keeping…" : "Keep on the contact"}
      </Button>
    </ActionForm>
  );
}

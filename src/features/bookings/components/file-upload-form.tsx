"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLOWED_TYPES } from "@/domain/files";
import { useToastedAction } from "@/hooks/use-action-toast";
import { uploadFile } from "../file-actions";

/**
 * Files a document on the booking. The code is read from the file's name (Settings › Filing
 * rules) unless chosen; filed final against a step, it settles that step.
 */
export function FileUploadForm({
  bookingId,
  codes,
  steps,
}: {
  bookingId: string;
  codes: string[];
  steps: { code: string; doc: string }[];
}) {
  const [state, run, pending] = useToastedAction(uploadFile);
  const fe = !state.ok ? state.fieldErrors : undefined;
  return (
    <ActionForm
      action={run}
      className="grid gap-2 border-t pt-3 sm:grid-cols-[2fr_1fr_8rem_2fr_auto] sm:items-end"
      encType="multipart/form-data"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <Field id="fu-file" label="File" error={fe?.file}>
        <Input
          id="fu-file"
          name="file"
          type="file"
          required
          accept={Object.keys(ALLOWED_TYPES).join(",")}
        />
      </Field>
      <Field id="fu-code" label="Filed as" error={fe?.code} hint="Empty: read from the name">
        <NativeSelect
          id="fu-code"
          name="code"
          placeholder="— from the name —"
          options={codes.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      <Field id="fu-stage" label="Stage" error={fe?.stage}>
        <NativeSelect
          id="fu-stage"
          name="stage"
          defaultValue="final"
          options={[
            { value: "final", label: "Final" },
            { value: "draft", label: "Draft" },
          ]}
        />
      </Field>
      <Field id="fu-step" label="Proves the step" error={fe?.ruleCode} hint="Final: marks it done">
        <NativeSelect
          id="fu-step"
          name="ruleCode"
          placeholder="— none —"
          options={steps.map((s) => ({ value: s.code, label: `${s.code} · ${s.doc}` }))}
        />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Filing…" : "File it"}
      </Button>
    </ActionForm>
  );
}

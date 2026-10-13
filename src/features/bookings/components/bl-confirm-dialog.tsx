"use client";

import { useState } from "react";
import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { BL_CHANNELS, type BlOutcome } from "@/domain/bl-confirm";
import { confirmBl } from "../bl-actions";

/**
 * The B/L confirmation (legacy blConfirm): confirmed as it is, or a correction wanted. A call
 * is fine for a plain confirmation; a correction needs the wording in writing.
 */
export function BlConfirmDialog({ bookingId }: { bookingId: string }) {
  const [outcome, setOutcome] = useState<BlOutcome>("ok");
  return (
    <FormDialog
      action={confirmBl}
      hidden={{ bookingId }}
      trigger="Confirm the B/L"
      title="Confirm the B/L"
      description="The draft went to the forwarder at destination. What came back?"
      submitLabel="Record the answer"
    >
      {(fe) => (
        <>
          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-1 font-medium">The answer</legend>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="outcome"
                value="ok"
                checked={outcome === "ok"}
                onChange={() => setOutcome("ok")}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                Confirmed as it is
                <span className="block text-xs text-muted-foreground">
                  Nothing to change — it can be issued.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="outcome"
                value="fix"
                checked={outcome === "fix"}
                onChange={() => setOutcome("fix")}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                A correction is wanted
                <span className="block text-xs text-muted-foreground">
                  Written down and sent back to the line.
                </span>
              </span>
            </label>
          </fieldset>
          <Field
            id="bl-channel"
            label="How it came in"
            hint={
              outcome === "fix"
                ? "A correction may not be agreed by phone — we need the wording in writing."
                : "A call is fine for a plain confirmation."
            }
            error={fe?.channel}
          >
            <NativeSelect
              id="bl-channel"
              name="channel"
              key={outcome}
              defaultValue={outcome === "fix" ? "whatsapp" : "email"}
              options={BL_CHANNELS.filter((c) => outcome === "ok" || c.copy).map((c) => ({
                value: c.key,
                label: c.label,
              }))}
            />
          </Field>
          {outcome === "fix" && (
            <Field id="bl-text" label="What has to change" error={fe?.text}>
              <Input
                id="bl-text"
                name="text"
                required
                placeholder="Consignee address, box 3 weight…"
              />
            </Field>
          )}
        </>
      )}
    </FormDialog>
  );
}

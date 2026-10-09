"use client";

import { ActionForm } from "@/components/shared/action-form";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { checkRequirement, sendBackRequirement } from "../review-actions";
import { type Checklist } from "@/domain/checklists";
import { ChecklistDialog } from "./checklist-dialog";
import { type NeedKind } from "@/domain/rules/engine";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";

/** Checked, or sent back with a reason — the office's word on a paper (legacy verified / rejected). */
/** What the close is called, by what closes the step (legacy NEED_KINDS). */
const CLOSE_LABEL: Record<NeedKind, string> = {
  file: "Checked",
  ref: "Record the number",
  confirm: "Confirmed",
  send: "Sent",
  track: "Confirm by hand",
};

export function RequirementActions({
  bookingId,
  code,
  label,
  state,
  need = "file",
  list = null,
}: {
  bookingId: string;
  code: string;
  label: string;
  state: string;
  need?: NeedKind;
  /** The checklist the paper is checked against, when its rule names one: the list is the close. */
  list?: Checklist | null;
}) {
  const [, check, pending] = useToastedAction(checkRequirement);
  return (
    <span className="flex gap-2">
      {state !== "checked" && list && (
        <ChecklistDialog bookingId={bookingId} code={code} list={list} />
      )}
      {state !== "checked" && !list && need === "ref" && (
        <FormDialog
          action={checkRequirement}
          hidden={{ bookingId, code }}
          trigger="Record the number"
          title={label}
          description="This closes on the number itself — there is nothing to attach. The number goes on the B/L and on the declaration."
          submitLabel="Record it"
        >
          {(fe) => (
            <Field id={`ref-${code}`} label="The number" error={fe?.reason}>
              <Input id={`ref-${code}`} name="reason" required className="font-mono" />
            </Field>
          )}
        </FormDialog>
      )}
      {state !== "checked" && !list && need !== "ref" && (
        <ActionForm action={check}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="code" value={code} />
          {need === "track" && (
            <input
              type="hidden"
              name="reason"
              value="confirmed by hand — the feed will do this later"
            />
          )}
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            title={need === "track" ? "The tracking feed will do this later" : undefined}
          >
            {pending ? "Saving…" : CLOSE_LABEL[need]}
          </Button>
        </ActionForm>
      )}
      {state !== "sent_back" && (
        <ReasonDialog
          action={sendBackRequirement}
          hidden={{ bookingId, code }}
          trigger="Send back"
          title={`Send ${code} back?`}
          description="The paper goes back with the reason; its step opens again until a corrected one is filed and checked."
          confirmLabel="Send back"
        />
      )}
    </span>
  );
}

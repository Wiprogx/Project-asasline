"use client";

import { ActionForm } from "@/components/shared/action-form";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { checkRequirement, sendBackRequirement } from "../review-actions";

/** Checked, or sent back with a reason — the office's word on a paper (legacy verified / rejected). */
export function RequirementActions({
  bookingId,
  code,
  state,
}: {
  bookingId: string;
  code: string;
  state: string;
}) {
  const [, check, pending] = useToastedAction(checkRequirement);
  return (
    <span className="flex gap-2">
      {state !== "checked" && (
        <ActionForm action={check}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="code" value={code} />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Saving…" : "Checked"}
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

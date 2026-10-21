"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { HAND_STATUSES } from "@/domain/quotation-status";
import type { QuotationStatus } from "@/domain/shipments";
import { useToastedAction } from "@/hooks/use-action-toast";
import {
  cancelQuotation,
  rejectQuotation,
  restoreQuotation,
  setQuotationStatus,
} from "../status-actions";
import { quotationStatusSchema } from "../status-schemas";
import { QUOTATION_TONE } from "../status";

type Props = {
  id: string;
  version: number;
  status: QuotationStatus;
  cancelReasons: string[];
};

/** Status by hand, rejected as lost, cancelled with a reason, put back (legacy setQSt, markLost, cancelQuote). */
export function QuotationStatusControls({ id, version, status, cancelReasons }: Props) {
  const [, statusAction, statusPending] = useToastedAction(
    setQuotationStatus,
    undefined,
    quotationStatusSchema,
  );
  const [, restoreAction, restorePending] = useToastedAction(restoreQuotation);
  const hidden = { id, version };

  if (status === "cancelled")
    return (
      <ActionForm action={restoreAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <Button type="submit" variant="outline" size="sm" disabled={restorePending}>
          Put back
        </Button>
      </ActionForm>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionForm action={statusAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <NativeSelect
          key={`${status}-${version}`}
          name="status"
          defaultValue={status === "declined" ? "" : status}
          placeholder={status === "declined" ? "Rejected — reopen as…" : undefined}
          aria-label="Status"
          className="w-44"
          options={HAND_STATUSES.map((s) => ({ value: s, label: QUOTATION_TONE[s][0] }))}
        />
        <Button type="submit" size="sm" variant="outline" disabled={statusPending}>
          Set
        </Button>
      </ActionForm>
      {status !== "declined" && status !== "accepted" && (
        <ReasonDialog
          action={rejectQuotation}
          hidden={hidden}
          trigger="Reject"
          title="The customer rejected this quotation"
          description="It keeps its number for the archive and never gets a booking. You can reopen it from the status."
          confirmLabel="Mark as rejected"
        />
      )}
      <ReasonDialog
        action={cancelQuotation}
        hidden={hidden}
        trigger="Cancel quotation"
        title="Cancel this quotation?"
        description="It keeps its number and history and leaves the active list and the figures. Open tasks are withdrawn. You can put it back."
        confirmLabel="Cancel it"
        reasons={cancelReasons}
      />
    </div>
  );
}

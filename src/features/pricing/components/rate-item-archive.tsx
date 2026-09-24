"use client";

import { ActionForm } from "@/components/shared/action-form";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { archiveRateItem, restoreRateItem } from "../item-actions";

export function RateItemArchive({ id, archived }: { id: string; archived: boolean }) {
  const [, restore, pending] = useToastedAction(restoreRateItem);
  if (archived)
    return (
      <ActionForm action={restore}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Put back
        </Button>
      </ActionForm>
    );
  return (
    <ReasonDialog
      action={archiveRateItem}
      hidden={{ id }}
      trigger="Take out of use"
      title="Take this item out of the catalogue?"
      description="It is no longer offered on new quotations; quotations and agreements that used it keep it. You can put it back."
      confirmLabel="Take out of use"
    />
  );
}

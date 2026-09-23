"use client";

import { ActionForm } from "@/components/shared/action-form";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { archiveContact, restoreContact } from "../actions";

export function ContactArchive({
  id,
  version,
  archived,
}: {
  id: string;
  version: number;
  archived: boolean;
}) {
  const [, restore, pending] = useToastedAction(restoreContact);

  if (archived) {
    return (
      <ActionForm action={restore}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Put back
        </Button>
      </ActionForm>
    );
  }
  return (
    <ReasonDialog
      action={archiveContact}
      hidden={{ id, version }}
      trigger="Archive"
      title="Archive this contact?"
      description="It leaves the lists but keeps its history, documents and messages. You can put it back."
      confirmLabel="Archive"
    />
  );
}

"use client";

import { useActionState } from "react";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { IDLE } from "@/lib/action-result";
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
  const [state, restore, pending] = useActionState(restoreContact, IDLE);
  useActionToast(state);

  if (archived) {
    return (
      <form action={restore}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Put back
        </Button>
      </form>
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

"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { claimMessage } from "../actions";

export function ClaimButton({ id }: { id: string }) {
  const [, run, pending] = useToastedAction(claimMessage);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" disabled={pending}>
        Take it
      </Button>
    </ActionForm>
  );
}

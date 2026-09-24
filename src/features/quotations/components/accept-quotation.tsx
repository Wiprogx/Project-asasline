"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import { acceptQuotation } from "../actions";

/** Accepts one destination: it becomes its own booking. */
export function AcceptQuotation({
  id,
  version,
  routeId,
}: {
  id: string;
  version: number;
  routeId: string;
}) {
  const [, action, pending] = useToastedAction(acceptQuotation);
  return (
    <ActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="routeId" value={routeId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating booking…" : "Accept → create booking"}
      </Button>
    </ActionForm>
  );
}

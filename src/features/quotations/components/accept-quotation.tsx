"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { IDLE } from "@/lib/action-result";
import { acceptQuotation } from "../actions";

export function AcceptQuotation({ id, version }: { id: string; version: number }) {
  const [state, action, pending] = useActionState(acceptQuotation, IDLE);
  useActionToast(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating booking…" : "Accept → create booking"}
      </Button>
    </form>
  );
}

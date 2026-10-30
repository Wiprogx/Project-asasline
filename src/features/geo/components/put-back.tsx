"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { useToastedAction } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { restoreSchema } from "../schemas";

/** "Put back" on an archived country or city: offered again. */
export function PutBack({
  action,
  id,
  version,
}: {
  action: (p: ActionResult, fd: FormData) => Promise<ActionResult>;
  id: string;
  version: number;
}) {
  const [, run, pending] = useToastedAction(action, undefined, restoreSchema);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Put back
      </Button>
    </ActionForm>
  );
}

"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { type ActionResult, IDLE } from "@/lib/action-result";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/**
 * `useActionState` that announces the outcome the moment the server answers.
 *
 * The toast used to come from an effect after the next render — but a successful action often
 * removes the very component that ran it (the archived contact's dialog, the removed box's
 * row), so the effect never ran and the person saw nothing. Toasting inside the action
 * callback happens before any re-render; sonner's store outlives the component.
 */
export function useToastedAction(action: Action, onOk?: () => void) {
  return useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) {
      toast.success(result.message ?? "Done");
      onOk?.();
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, IDLE);
}

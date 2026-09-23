"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { type ActionResult, IDLE } from "@/lib/action-result";

type Action<T> = (prev: ActionResult<T>, fd: FormData) => Promise<ActionResult<T>>;

/**
 * `useActionState` that announces the outcome the moment the server answers.
 *
 * The toast used to come from an effect after the next render — but a successful action often
 * removes the very component that ran it (the archived contact's dialog, the removed box's
 * row), so the effect never ran and the person saw nothing. Toasting inside the action
 * callback happens before any re-render; sonner's store outlives the component.
 */
export function useToastedAction<T>(action: Action<T>, onOk?: (data: T) => void) {
  return useActionState(async (prev: ActionResult<T>, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) {
      toast.success(result.message ?? "Done");
      onOk?.(result.data);
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, IDLE as ActionResult<T>);
}

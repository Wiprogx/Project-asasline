"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { type ActionResult, formToObject, IDLE, invalid } from "@/lib/action-result";

type Action<T> = (prev: ActionResult<T>, fd: FormData) => Promise<ActionResult<T>>;

/**
 * `useActionState` that announces the outcome the moment the server answers.
 *
 * The toast used to come from an effect after the next render — but a successful action often
 * removes the very component that ran it (the archived contact's dialog, the removed box's
 * row), so the effect never ran and the person saw nothing. Toasting inside the action
 * callback happens before any re-render; sonner's store outlives the component.
 *
 * With `schema` — the very zod schema the server action parses — the form is checked in the
 * browser first, so a missing field or a bad date is said at once, with the server's own
 * words, without a round trip. The server still parses: the browser is a convenience, never
 * the guard.
 */
export function useToastedAction<T>(
  action: Action<T>,
  onOk?: (data: T) => void,
  schema?: z.ZodType,
) {
  return useActionState(async (prev: ActionResult<T>, fd: FormData) => {
    if (schema) {
      const parsed = schema.safeParse(formToObject(fd));
      if (!parsed.success) {
        const refused = invalid(parsed.error) as ActionResult<T>;
        if (!refused.ok) toast.error(refused.error, { duration: ERROR_MS });
        return refused;
      }
    }
    const result = await action(prev, fd);
    if (result.ok) {
      toast.success(result.message ?? "Done");
      onOk?.(result.data);
    } else if (result.error) {
      // A refusal stays long enough to be read (and heard): sonner's default is four seconds.
      toast.error(result.error, { duration: ERROR_MS });
    }
    return result;
  }, IDLE as ActionResult<T>);
}

const ERROR_MS = 8000;

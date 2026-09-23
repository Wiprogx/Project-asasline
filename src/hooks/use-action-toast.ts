"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

/** Toasts the outcome of a server action once per result. */
export function useActionToast(state: ActionResult<unknown>, onOk?: () => void) {
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      toast.success(state.message ?? "Done");
      onOk?.();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onOk]);
}

"use client";

import { type ComponentProps, startTransition, useEffect, useRef } from "react";

type Props = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (formData: FormData) => void;
};

/**
 * A form for `useActionState` actions that keeps what the person typed.
 *
 * With `<form action={…}>`, React 19 resets every uncontrolled field once the action returns —
 * and an action that answers "ETA is before ETD" has returned, so the whole form was wiped and
 * the next save sent only the one field re-typed. Submitting through a transition instead
 * leaves the fields alone; a form that should clear on success resets itself explicitly.
 *
 * `data-hydrated` is set once React has committed the form: a field typed into before that
 * moment can have its server text re-applied over what was typed. The browser suite waits
 * for it before typing (e2e/helpers open()).
 */
export function ActionForm({ action, ...props }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("data-hydrated", "1");
  }, []);
  return (
    <form
      ref={ref}
      data-action-form=""
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    />
  );
}

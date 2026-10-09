import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + first error, wired for screen readers: the one control inside is told
 * which text describes it (the error, else the hint) and that it is invalid, so a reader
 * announces the message with the field and the input can style itself.
 */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  const message = error?.[0];
  const describedBy = message ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control =
    Children.count(children) === 1 && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-describedby": describedBy,
          "aria-invalid": message ? true : undefined,
        })
      : children;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {message ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {message}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

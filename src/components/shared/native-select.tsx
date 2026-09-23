import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A styled native <select>: posts with FormData, works before hydration and on every phone.
 * The shadcn Select is for rich pickers; plain forms use this.
 */
export function NativeSelect({
  options,
  placeholder,
  className,
  ...props
}: ComponentProps<"select"> & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

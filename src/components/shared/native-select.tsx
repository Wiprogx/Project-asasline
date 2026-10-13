import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A styled native <select>: posts with FormData, works before hydration and on every phone.
 * The shadcn Select is for rich pickers; plain forms use this.
 *
 * The option list is drawn by the operating system from each option's own colours: left to
 * inherit, it showed the dark theme's light text on a light list, almost invisible. Every option
 * carries the popover's colours, so the open list reads at 10:1 in both themes.
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
        "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-control/30 [&_optgroup]:bg-popover [&_optgroup]:text-popover-foreground [&_option]:bg-popover [&_option]:text-popover-foreground",
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

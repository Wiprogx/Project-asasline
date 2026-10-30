"use client";

import { Select } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };
/** The shape the old native <select> handed its onChange, so every caller's `e.target.value` still reads. */
type SelectChange = { target: { value: string } };

/**
 * The plain forms' select: posts its value with FormData under `name`, like the native one it
 * replaced, but draws its own list — a native list is drawn by the operating system, as wide as
 * its longest option. This one is exactly as wide as the field, in the popover's colours in both
 * themes. `placeholder` is an empty first choice; without a value the first option is chosen.
 */
export function NativeSelect({
  options,
  placeholder,
  className,
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  ...aria
}: {
  options: readonly Option[];
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: SelectChange) => void;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const items: Option[] = [
    ...(placeholder !== undefined ? [{ value: "", label: placeholder }] : []),
    ...options,
  ];
  const first = items[0]?.value ?? "";
  // Held here when the caller does not: the trigger carries the value (data-value), as a
  // native select's value is readable, for the tests and anything reading the page.
  const [own, setOwn] = useState(defaultValue === undefined ? first : String(defaultValue));
  const current = value !== undefined ? String(value) : own;
  return (
    <Select.Root
      items={items}
      name={name}
      required={required}
      disabled={disabled}
      value={current}
      onValueChange={(v) => {
        setOwn(v ?? "");
        onChange?.({ target: { value: v ?? "" } });
      }}
    >
      <Select.Trigger
        id={id}
        data-value={current}
        {...aria}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-left text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-control/30 data-disabled:cursor-not-allowed data-disabled:opacity-60",
          className,
        )}
      >
        <Select.Value className="truncate" />
        <Select.Icon className="shrink-0 text-muted-foreground">
          <ChevronDownIcon className="size-4" aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          alignItemWithTrigger={false}
          sideOffset={4}
          className="z-50 w-(--anchor-width) outline-none"
        >
          <Select.Popup className="max-h-(--available-height) w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md">
            {items.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                data-value={o.value}
                className="flex cursor-default items-center justify-between gap-2 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                <Select.ItemText className="min-w-0 break-words">{o.label}</Select.ItemText>
                <Select.ItemIndicator className="shrink-0">
                  <CheckIcon className="size-4" aria-hidden />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

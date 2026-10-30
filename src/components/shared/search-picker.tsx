"use client";

import { Combobox } from "@base-ui/react/combobox";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** One choice: `value` posts, `label` shows, `code` (an ISO code, a country) shows beside it and is searched too. */
export type PickerOption = { value: string; label: string; code?: string };

const text = (o: PickerOption) => (o.code ? `${o.label} (${o.code})` : o.label);

/** The option typed out in full: its code, its label or its whole text, in any case. */
function resolve(options: readonly PickerOption[], typed: string): PickerOption | null {
  const t = typed.trim().toLowerCase();
  if (!t) return null;
  const hit = (o: PickerOption) =>
    o.code?.toLowerCase() === t || o.label.toLowerCase() === t || text(o).toLowerCase() === t;
  return options.find(hit) ?? null;
}

/** The options the query finds, best first: the exact code, then a label that starts with it. */
function search(options: readonly PickerOption[], query: string): PickerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  const rank = (o: PickerOption) =>
    o.code?.toLowerCase() === q ? 0 : o.label.toLowerCase().startsWith(q) ? 1 : 2;
  return options
    .filter((o) => rank(o) < 2 || text(o).toLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b));
}

/**
 * A select you type into (SELECT2-like): it finds an option by its label or its code, posts the
 * option's value under `name`, and matches text left without a pick on blur, so "be" is Belgium.
 */
export function SearchPicker({
  id,
  name,
  options,
  defaultValue,
  placeholder,
  empty = "Nothing matches.",
  className,
  onChange,
  ...aria
}: {
  id: string;
  name: string;
  options: readonly PickerOption[];
  /** The value saved; one not among the options is kept and shown as it is. */
  defaultValue?: string | null;
  placeholder?: string;
  empty?: string;
  className?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  /** Told the value picked (or matched on blur), null when cleared. */
  onChange?: (value: string | null) => void;
}) {
  const initial = defaultValue
    ? (options.find((o) => o.value === defaultValue) ?? {
        value: defaultValue,
        label: defaultValue,
      })
    : null;
  const [value, setValue] = useState<PickerOption | null>(initial);
  const [typed, setTyped] = useState(initial ? text(initial) : "");

  const pick = (o: PickerOption | null) => {
    setValue(o);
    setTyped(o ? text(o) : "");
    onChange?.(o?.value ?? null);
  };

  return (
    <Combobox.Root
      items={options}
      filteredItems={value && typed === text(value) ? options : search(options, typed)}
      filter={null}
      value={value}
      onValueChange={pick}
      inputValue={typed}
      onInputValueChange={(t) => {
        setTyped(t);
        if (!t) setValue(null);
      }}
      name={name}
      itemToStringLabel={text}
      itemToStringValue={(o) => o.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      autoHighlight
    >
      <Combobox.Input
        id={id}
        placeholder={placeholder}
        autoComplete="off"
        onBlur={() => {
          if (!value || typed !== text(value)) pick(resolve(options, typed));
        }}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-control/30",
          className,
        )}
        {...aria}
      />
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50 w-(--anchor-width) outline-none">
          <Combobox.Popup className="max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md">
            <Combobox.Empty className="px-2 py-1.5 text-muted-foreground empty:hidden">
              {empty}
            </Combobox.Empty>
            <Combobox.List>
              {(o: PickerOption) => (
                <Combobox.Item
                  key={o.value}
                  value={o}
                  className="flex cursor-default items-center justify-between gap-3 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium"
                >
                  <span className="truncate">{o.label}</span>
                  {o.code && (
                    <span className="font-mono text-xs text-muted-foreground">{o.code}</span>
                  )}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

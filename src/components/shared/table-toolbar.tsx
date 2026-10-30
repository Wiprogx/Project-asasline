"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TableView } from "@/hooks/use-table-view";
import type { TableFilter } from "@/lib/table-view";

const ALL = "__all";

function FilterSelect<T>({
  f,
  value,
  onChange,
}: {
  f: TableFilter<T>;
  value: string;
  onChange: (v: string) => void;
}) {
  const items = [
    { value: ALL, label: `${f.label}: all` },
    ...f.options.map((o) => ({ value: o.value, label: `${f.label}: ${o.label}` })),
  ];
  return (
    <Select
      items={items}
      value={value || ALL}
      onValueChange={(v) => onChange(v === ALL || typeof v !== "string" ? "" : v)}
    >
      <SelectTrigger size="sm" aria-label={f.label} className="min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Above a table: the search box (left out when the page searches on the server), one picker per
 * filter, how many rows are shown and a way back to everything.
 */
export function TableToolbar<T>({
  view,
  filters = [],
  searchLabel,
  noun = "rows",
}: {
  view: TableView<T>;
  filters?: readonly TableFilter<T>[];
  searchLabel?: string;
  noun?: string;
}) {
  const { state } = view;
  const [text, setText] = useState(state.q);
  // The URL moved without us (Back, a link): the box shows it. Our own write is not echoed back,
  // so letters typed while it travelled are kept.
  const [seen, setSeen] = useState(state.q);
  const [sent, setSent] = useState(state.q);
  if (seen !== state.q) {
    setSeen(state.q);
    if (state.q !== sent) setText(state.q);
  }
  const { setFilter } = view;
  useEffect(() => {
    const q = text.trim() ? text : "";
    if (q === state.q) return;
    const t = setTimeout(() => {
      setSent(q);
      setFilter("q", q);
    }, 250);
    return () => clearTimeout(t);
  }, [text, state.q, setFilter]);
  const narrowed = Boolean(state.q || state.sort || Object.values(state.filters).some(Boolean));
  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={view.pending}>
      {searchLabel && (
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="h-8 pl-8"
          />
        </div>
      )}
      {filters.map((f) => (
        <FilterSelect
          key={f.key}
          f={f}
          value={state.filters[f.key] ?? ""}
          onChange={(v) => view.setFilter(f.key, v)}
        />
      ))}
      {narrowed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setText("");
            view.clear();
          }}
        >
          <XIcon aria-hidden /> Clear
        </Button>
      )}
      <span className="ml-auto text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {view.rows.length === view.total
          ? `${view.total} ${noun}`
          : `${view.rows.length} of ${view.total} ${noun}`}
      </span>
    </div>
  );
}

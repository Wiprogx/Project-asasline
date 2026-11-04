"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import type { TableState } from "@/lib/table-view";
import { cn } from "@/lib/utils";

type SortProps = {
  sortKey: string;
  state: Pick<TableState, "sort" | "dir">;
  onSort: (key: string) => void;
  className?: string;
  children: ReactNode;
};

/** The header's `aria-sort`, for a header built elsewhere around a SortToggle. */
export const ariaSort = (state: Pick<TableState, "sort" | "dir">, sortKey: string) =>
  state.sort === sortKey ? (state.dir === "asc" ? "ascending" : "descending") : undefined;

/** The button that orders the table: ascending, descending, then the table's own order. */
export function SortToggle({ sortKey, state, onSort, className, children }: SortProps) {
  const on = state.sort === sortKey;
  const Icon = !on ? ArrowUpDownIcon : state.dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  const right = className?.includes("text-right");
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onSort(sortKey)}
      className={cn(
        "-mx-2 h-7 gap-1 px-2 font-medium",
        right && "flex-row-reverse",
        !on && "text-muted-foreground",
      )}
    >
      {children}
      <Icon className={cn("size-3.5", !on && "opacity-50")} aria-hidden />
    </Button>
  );
}

/** A column header that orders the table. */
export function SortableHead(props: SortProps) {
  return (
    <TableHead className={props.className} aria-sort={ariaSort(props.state, props.sortKey)}>
      <SortToggle {...props} />
    </TableHead>
  );
}

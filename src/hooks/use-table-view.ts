"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { nextSort, type TableSpec, type TableState, viewRows } from "@/lib/table-view";

export type TableView<T> = {
  rows: T[];
  total: number;
  state: TableState;
  pending: boolean;
  toggleSort: (key: string) => void;
  setFilter: (key: string, value: string) => void;
  clear: () => void;
};

/**
 * A table's search (?q=), sort (?sort=&dir=) and filters (one parameter each) held in the URL,
 * so a view is a link that survives a reload; the rows are narrowed and ordered in the browser.
 */
export function useTableView<T>(rows: readonly T[], spec: TableSpec<T>): TableView<T> {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const state = useMemo<TableState>(() => {
    const sort = params.get("sort");
    return {
      q: params.get("q") ?? "",
      sort: sort && sort in spec.sorts ? sort : null,
      dir: params.get("dir") === "desc" ? "desc" : "asc",
      filters: Object.fromEntries(
        (spec.filters ?? []).map((f) => [f.key, params.get(f.key) ?? ""]),
      ),
    };
  }, [params, spec.sorts, spec.filters]);

  const go = (edit: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    edit(next);
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const set = (next: URLSearchParams, key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };

  return {
    rows: viewRows(rows, spec, state),
    total: rows.length,
    state,
    pending,
    toggleSort: (key) =>
      go((next) => {
        const s = nextSort(state, key);
        set(next, "sort", s.sort);
        set(next, "dir", s.sort && s.dir === "desc" ? "desc" : null);
      }),
    setFilter: (key, value) => go((next) => set(next, key, value)),
    clear: () =>
      go((next) => {
        for (const k of ["q", "sort", "dir", ...(spec.filters ?? []).map((f) => f.key)])
          next.delete(k);
      }),
  };
}

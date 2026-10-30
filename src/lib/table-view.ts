/** Search, filters and sort over the rows a table already holds (a Settings table is small). */

export type SortDir = "asc" | "desc";
export type SortValue = string | number | boolean | null | undefined;

export type TableFilter<T> = {
  key: string;
  label: string;
  options: readonly { value: string; label: string }[];
  test: (row: T, value: string) => boolean;
};

export type TableSpec<T> = {
  /** The words a row is found by; leave it out when the server already searched. */
  search?: (row: T) => readonly (string | null | undefined)[];
  filters?: readonly TableFilter<T>[];
  sorts: Record<string, (row: T) => SortValue>;
};

export type TableState = {
  q: string;
  sort: string | null;
  dir: SortDir;
  filters: Record<string, string>;
};

/** Empty values sort last whichever way; words compare as the office reads them (2 before 10). */
export function compareValues(a: SortValue, b: SortValue, dir: SortDir): number {
  const empty = (v: SortValue) => v === null || v === undefined || v === "";
  if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1;
  const n =
    typeof a === "string" || typeof b === "string"
      ? String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" })
      : Number(a) - Number(b);
  return dir === "asc" ? n : -n;
}

function matches<T>(row: T, spec: TableSpec<T>, state: TableState): boolean {
  const q = state.q.trim().toLowerCase();
  if (q && spec.search && !spec.search(row).some((v) => v?.toLowerCase().includes(q))) return false;
  return (spec.filters ?? []).every((f) => {
    const v = state.filters[f.key];
    return !v || f.test(row, v);
  });
}

/** The rows shown: those that match, in the chosen order (a stable sort; none keeps theirs). */
export function viewRows<T>(rows: readonly T[], spec: TableSpec<T>, state: TableState): T[] {
  const shown = rows.filter((r) => matches(r, spec, state));
  const by = state.sort ? spec.sorts[state.sort] : undefined;
  if (!by) return shown;
  return shown
    .map((row, i) => ({ row, i, v: by(row) }))
    .sort((a, b) => compareValues(a.v, b.v, state.dir) || a.i - b.i)
    .map((x) => x.row);
}

/** A click on a column: ascending, then descending, then back to the table's own order. */
export function nextSort(
  state: Pick<TableState, "sort" | "dir">,
  key: string,
): { sort: string | null; dir: SortDir } {
  if (state.sort !== key) return { sort: key, dir: "asc" };
  if (state.dir === "asc") return { sort: key, dir: "desc" };
  return { sort: null, dir: "asc" };
}

/**
 * How a person reads a list: the columns they chose and how wide they dragged each one. Kept per
 * person (user_prefs), never in the record; a value the list no longer offers is dropped on read.
 */
export type TablePrefs<K extends string> = {
  columns: K[];
  /** Pixels per column key; a column without one takes the list's default. */
  widths: Record<string, number>;
};

export const WIDTH_MIN = 60;
export const WIDTH_MAX = 800;
/** One keyboard step of a column's drag handle. */
export const WIDTH_STEP = 16;

export const clampWidth = (px: number) => Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(px)));

const asObject = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

/**
 * The saved preference, read safely: the columns in the list's own order (an absent or broken
 * list means the defaults; an empty one means none), the widths only for keys in `sizable`.
 */
export function parseTablePrefs<K extends string>(
  all: readonly { key: K }[],
  defaults: readonly K[],
  raw: unknown,
  sizable: readonly string[] = all.map((d) => d.key),
): TablePrefs<K> {
  const r = asObject(raw);
  const asked = Array.isArray(r.columns) ? new Set(r.columns.map(String)) : null;
  const columns = asked ? all.map((d) => d.key).filter((k) => asked.has(k)) : [...defaults];
  const widths: Record<string, number> = {};
  for (const [k, v] of Object.entries(asObject(r.widths))) {
    if (sizable.includes(k) && typeof v === "number" && Number.isFinite(v))
      widths[k] = clampWidth(v);
  }
  return { columns, widths };
}

/** The saved preference with a change laid over it: a part not in the patch is kept as it was. */
export function mergeTablePrefs<K extends string>(
  prev: TablePrefs<K>,
  patch: { columns?: readonly K[]; widths?: Record<string, number> },
): TablePrefs<K> {
  return {
    columns: patch.columns ? [...patch.columns] : prev.columns,
    widths: patch.widths ? { ...patch.widths } : prev.widths,
  };
}

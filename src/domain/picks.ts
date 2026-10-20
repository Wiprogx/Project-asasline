/** Columns and figures chosen by the office, kept in the URL (legacy ⚙ column and figure pickers). */

/** The keys asked for in a URL value ("a,b,c"; "none" = nothing), or the defaults. */
export function parsePicks<K extends string>(
  all: readonly { key: K }[],
  defaults: readonly K[],
  param: unknown,
): K[] {
  if (param === "none") return [];
  if (typeof param !== "string" || !param) return [...defaults];
  const asked = new Set(param.split(","));
  const keys = all.map((d) => d.key).filter((k) => asked.has(k));
  return keys.length ? keys : [...defaults];
}

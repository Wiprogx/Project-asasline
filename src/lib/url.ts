/** A link to the same page with some of its parameters changed (a filter added, a page dropped). */
export function hrefWith(
  pathname: string,
  params: URLSearchParams | Record<string, string | undefined>,
  patch: Record<string, string | null | undefined>,
  drop: readonly string[] = ["page"],
): string {
  const next =
    params instanceof URLSearchParams
      ? new URLSearchParams(params)
      : new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  for (const k of drop) next.delete(k);
  for (const [k, v] of Object.entries(patch)) {
    if (v) next.set(k, v);
    else next.delete(k);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

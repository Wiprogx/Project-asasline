import Link from "next/link";

/** Previous · page n of m · next, keeping the rest of the address. */
export function Pager({
  path,
  params,
  page,
  pages,
  total,
  noun,
}: {
  path: string;
  params: Record<string, string>;
  page: number;
  pages: number;
  total: number;
  noun: string;
}) {
  if (pages <= 1) return null;
  const href = (n: number) => `${path}?${new URLSearchParams({ ...params, page: String(n) })}`;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {total} {noun} · page {page} of {pages}
      </span>
      <span className="flex gap-3">
        {page > 1 && (
          <Link className="hover:underline" href={href(page - 1)}>
            ‹ Previous
          </Link>
        )}
        {page < pages && (
          <Link className="hover:underline" href={href(page + 1)}>
            Next ›
          </Link>
        )}
      </span>
    </nav>
  );
}

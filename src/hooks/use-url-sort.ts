"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { nextSort, type SortDir } from "@/lib/table-view";
import { hrefWith } from "@/lib/url";

/**
 * The order asked in the URL (?sort=&dir=), and a click on a header that moves it on: ascending,
 * descending, then the list's own order. The server orders the rows; the page starts over.
 */
export function useUrlSort() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state: { sort: string | null; dir: SortDir } = {
    sort: params.get("sort"),
    dir: params.get("dir") === "desc" ? "desc" : "asc",
  };
  const toggleSort = (key: string) => {
    const s = nextSort(state, key);
    router.replace(
      hrefWith(pathname, params, { sort: s.sort, dir: s.sort && s.dir === "desc" ? "desc" : null }),
      { scroll: false },
    );
  };
  return { state, toggleSort };
}

import type { PeriodKey } from "@/domain/periods";
import type { QuotationStatus } from "@/domain/shipments";
import { hrefWith } from "@/lib/url";

/** The quotations list's URL, read once by the page and handed to its navs and chips. */
export type ListParams = {
  q?: string;
  status?: QuotationStatus;
  period: PeriodKey;
  cmp: boolean;
  figs?: string;
  /** "Show similar" on a customer. */
  client?: string;
  /** "Filter out" on a customer or a status. */
  xclient?: string;
  xstatus?: QuotationStatus;
  sort?: string;
  dir?: string;
};

/** The list with some of its parameters changed; the defaults leave the URL clean. */
export function listHref(p: ListParams, patch: Partial<ListParams>): string {
  const n = { ...p, ...patch };
  return hrefWith(
    "/quotations",
    {
      q: n.q,
      status: n.status,
      period: n.period !== "all" ? n.period : undefined,
      cmp: n.cmp ? "prev" : undefined,
      figs: n.figs,
      client: n.client,
      xclient: n.xclient,
      xstatus: n.xstatus,
      sort: n.sort,
      dir: n.dir,
    },
    {},
  );
}

import Link from "next/link";
import { listFigures } from "@/domain/booking-list";
import { BILL_FILTER_LABEL, BILL_FILTERS, type BillFilter } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import { cn } from "@/lib/utils";
import type { BookingRow } from "../queries";

/**
 * The figures of the list as it is filtered (legacy bStatsPanel), and the "Invoiced" chips
 * (legacy fbill): each chip is a link, so a filter can be bookmarked.
 */
export function BookingsFigures({
  rows,
  params,
  billing,
}: {
  rows: BookingRow[];
  /** The other query parameters, kept on every chip. */
  params: Record<string, string | undefined>;
  billing?: BillFilter;
}) {
  const f = listFigures(rows);
  const href = (b?: BillFilter) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, billing: b })) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/bookings?${qs}` : "/bookings";
  };
  const chip = (label: string, b?: BillFilter) => (
    <Link
      key={b ?? "all"}
      href={href(b)}
      aria-current={billing === b ? "page" : undefined}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap",
        billing === b ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-4 grid gap-2">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Figures">
        <div>
          <dt className="inline text-muted-foreground">Shown </dt>
          <dd className="inline font-medium">{f.count}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Value </dt>
          <dd className="inline font-medium tabular-nums">{formatCents(f.valueCents)}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Invoiced </dt>
          <dd className="inline font-medium tabular-nums">{formatCents(f.billedCents)}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Waiting for an invoice </dt>
          <dd className="inline font-medium">{f.notInvoiced + f.partly}</dd>
        </div>
        {f.over > 0 && (
          <div>
            <dt className="inline text-destructive">Over-invoiced </dt>
            <dd className="inline font-medium text-destructive">{f.over}</dd>
          </div>
        )}
      </dl>
      <nav aria-label="Invoiced" className="flex flex-wrap gap-1.5">
        {chip("Invoiced or not")}
        {BILL_FILTERS.map((b) => chip(BILL_FILTER_LABEL[b], b))}
      </nav>
    </div>
  );
}

import Link from "next/link";
import { formatCents } from "@/domain/money";
import { quotationFigures } from "@/domain/quotation-list";
import { QUOTATION_STATUSES, type QuotationStatus } from "@/domain/shipments";
import { cn } from "@/lib/utils";
import type { QuotationRow } from "../queries";
import { QUOTATION_TONE } from "../status";

/**
 * The figures of the list as it is filtered (legacy STAT_DEFS default set) and the status
 * chips: each chip is a link, so a view can be bookmarked.
 */
export function QuotationsFigures({
  rows,
  q,
  status,
}: {
  rows: QuotationRow[];
  q?: string;
  status?: QuotationStatus;
}) {
  const f = quotationFigures(rows);
  const href = (s?: QuotationStatus) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (s) sp.set("status", s);
    const qs = sp.toString();
    return qs ? `/quotations?${qs}` : "/quotations";
  };
  const chip = (label: string, s?: QuotationStatus) => (
    <Link
      key={s ?? "all"}
      href={href(s)}
      aria-current={status === s ? "page" : undefined}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap",
        status === s ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
  const figure = (label: string, value: string | number) => (
    <div key={label}>
      <dt className="inline text-muted-foreground">{label} </dt>
      <dd className="inline font-medium tabular-nums">{value}</dd>
    </div>
  );
  return (
    <div className="mb-4 grid gap-2">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Figures">
        {figure("Shown", f.count)}
        {figure("Open", f.open)}
        {figure("Booked", f.accepted)}
        {figure("Declined", f.declined)}
        {figure("Booked value", formatCents(f.acceptedValueCents))}
        {figure("Win rate", f.winRate === null ? "—" : `${f.winRate}%`)}
      </dl>
      <nav aria-label="Status" className="flex flex-wrap gap-1.5">
        {chip("All")}
        {QUOTATION_STATUSES.map((s) => chip(QUOTATION_TONE[s][0], s))}
      </nav>
    </div>
  );
}

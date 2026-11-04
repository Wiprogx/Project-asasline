import Link from "next/link";
import { PERIOD_KEYS, PERIOD_LABEL } from "@/domain/periods";
import { QUOTATION_STATUSES } from "@/domain/shipments";
import { cn } from "@/lib/utils";
import { type ListParams, listHref } from "../list-params";
import { QUOTATION_TONE } from "../status";

function Chip({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      aria-current={on ? "page" : undefined}
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap",
        on ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/** A filter a row's menu added ("Show similar", "Filter out"), taken off with one click. */
function Taken({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className="inline-flex min-h-6 items-center gap-1 rounded-full border border-primary bg-primary/10 px-2.5 text-xs"
    >
      {children}
      <span aria-hidden="true">✕</span>
      <span className="sr-only">(remove)</span>
    </Link>
  );
}

/**
 * What narrows the list (legacy statsPanel chips): the period and the period before, the
 * status, and the customer or status a row's menu kept or left out.
 */
export function QuotationsFilters({
  params,
  periodLabel,
}: {
  params: ListParams;
  periodLabel: string;
}) {
  const taken = params.client || params.xclient || params.xstatus;
  return (
    <div className="grid gap-2">
      <nav aria-label="Period" className="flex flex-wrap items-center gap-1.5">
        {PERIOD_KEYS.map((k) => (
          <Chip key={k} to={listHref(params, { period: k })} on={params.period === k}>
            {PERIOD_LABEL[k]}
          </Chip>
        ))}
        {params.period !== "all" && (
          <Chip to={listHref(params, { cmp: !params.cmp })} on={params.cmp}>
            vs previous
          </Chip>
        )}
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      </nav>
      <nav aria-label="Status" className="flex flex-wrap gap-1.5">
        <Chip to={listHref(params, { status: undefined })} on={!params.status}>
          All
        </Chip>
        {QUOTATION_STATUSES.map((s) => (
          <Chip key={s} to={listHref(params, { status: s })} on={params.status === s}>
            {QUOTATION_TONE[s][0]}
          </Chip>
        ))}
      </nav>
      {taken && (
        <nav aria-label="Filters" className="flex flex-wrap items-center gap-1.5">
          {params.client && (
            <Taken to={listHref(params, { client: undefined })}>Customer: {params.client}</Taken>
          )}
          {params.xclient && (
            <Taken to={listHref(params, { xclient: undefined })}>
              Not customer: {params.xclient}
            </Taken>
          )}
          {params.xstatus && (
            <Taken to={listHref(params, { xstatus: undefined })}>
              Not status: {QUOTATION_TONE[params.xstatus][0]}
            </Taken>
          )}
        </nav>
      )}
    </div>
  );
}

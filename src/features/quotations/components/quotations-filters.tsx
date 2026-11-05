import { Chip, Taken } from "@/components/shared/filter-chip";
import { PERIOD_KEYS, PERIOD_LABEL } from "@/domain/periods";
import { QUOTATION_STATUSES } from "@/domain/shipments";
import { type ListParams, listHref } from "../list-params";
import { QUOTATION_TONE } from "../status";

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

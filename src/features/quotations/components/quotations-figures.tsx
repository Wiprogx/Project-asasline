import { formatCents } from "@/domain/money";
import {
  DEFAULT_FIGURE_KEYS,
  FIGURE_DEFS,
  type FigureKey,
  quotationFigures,
} from "@/domain/quotation-list";
import { deltaPercent } from "@/domain/periods";
import { cn } from "@/lib/utils";
import type { QuotationRow } from "../queries";
import { UrlPicks } from "@/components/shared/url-picks";

const text = (kind: (typeof FIGURE_DEFS)[number]["kind"], v: number | null) =>
  v === null ? "—" : kind === "cents" ? formatCents(v) : kind === "percent" ? `${v}%` : String(v);

/**
 * The figures of the list as it is filtered (legacy STAT_DEFS, statsPanel): the ones chosen,
 * over the period, against the period before when asked.
 */
export function QuotationsFigures({
  rows,
  before,
  shown,
}: {
  rows: QuotationRow[];
  /** The rows of the period before, when a comparison is asked. */
  before: QuotationRow[] | null;
  shown: readonly FigureKey[];
}) {
  const f = quotationFigures(rows);
  const prev = before ? quotationFigures(before) : null;
  return (
    <div className="mb-4 grid gap-2">
      {shown.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Figures">
          {FIGURE_DEFS.filter((d) => shown.includes(d.key)).map((d) => {
            const delta = prev ? deltaPercent(f[d.key], prev[d.key]) : null;
            return (
              <div key={d.key}>
                <dt className="inline text-muted-foreground">{d.label} </dt>
                <dd className="inline font-medium tabular-nums">
                  {text(d.kind, f[d.key])}
                  {delta !== null && (
                    <span
                      className={cn(
                        "ml-1 text-xs font-normal",
                        delta > 0
                          ? "text-success"
                          : delta < 0
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta)}%
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      <UrlPicks
        param="figs"
        title="Choose the figures"
        defs={FIGURE_DEFS}
        defaults={DEFAULT_FIGURE_KEYS}
        shown={shown}
      />
    </div>
  );
}

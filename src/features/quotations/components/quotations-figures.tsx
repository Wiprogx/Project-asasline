import Link from "next/link";
import { formatCents } from "@/domain/money";
import {
  FIGURE_DEFS,
  type FigureKey,
  quotationFigures,
  type Ranked,
  topCustomers,
} from "@/domain/quotation-list";
import { deltaPercent, PERIOD_KEYS, PERIOD_LABEL, type PeriodKey } from "@/domain/periods";
import { QUOTATION_STATUSES, type QuotationStatus } from "@/domain/shipments";
import { cn } from "@/lib/utils";
import type { QuotationRow } from "../queries";
import { QUOTATION_TONE } from "../status";
import { FigurePicker } from "./figure-picker";

type Params = {
  q?: string;
  status?: QuotationStatus;
  period: PeriodKey;
  cmp: boolean;
  figs?: string;
};

const href = (p: Params, patch: Partial<Params>) => {
  const n = { ...p, ...patch };
  const sp = new URLSearchParams();
  if (n.q) sp.set("q", n.q);
  if (n.status) sp.set("status", n.status);
  if (n.period !== "all") sp.set("period", n.period);
  if (n.cmp) sp.set("cmp", "prev");
  if (n.figs) sp.set("figs", n.figs);
  const qs = sp.toString();
  return qs ? `/quotations?${qs}` : "/quotations";
};

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

const text = (kind: (typeof FIGURE_DEFS)[number]["kind"], v: number | null) =>
  v === null ? "—" : kind === "cents" ? formatCents(v) : kind === "percent" ? `${v}%` : String(v);

/**
 * The figures of the list as it is filtered (legacy STAT_DEFS, statsPanel): the ones chosen,
 * over the period, against the period before when asked; the status chips; the rankings.
 */
export function QuotationsFigures({
  rows,
  before,
  shown,
  params,
  periodLabel,
  lanes,
}: {
  rows: QuotationRow[];
  /** The rows of the period before, when a comparison is asked. */
  before: QuotationRow[] | null;
  shown: readonly FigureKey[];
  params: Params;
  periodLabel: string;
  lanes: Ranked[];
}) {
  const f = quotationFigures(rows);
  const prev = before ? quotationFigures(before) : null;
  const customers = topCustomers(rows);
  return (
    <div className="mb-4 grid gap-2">
      <nav aria-label="Period" className="flex flex-wrap items-center gap-1.5">
        {PERIOD_KEYS.map((k) => (
          <Chip key={k} to={href(params, { period: k })} on={params.period === k}>
            {PERIOD_LABEL[k]}
          </Chip>
        ))}
        {params.period !== "all" && (
          <Chip to={href(params, { cmp: !params.cmp })} on={params.cmp}>
            vs previous
          </Chip>
        )}
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      </nav>
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
      <FigurePicker shown={shown} />
      {(customers.length > 0 || lanes.length > 0) && (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Ranking title="Top 5 customers" rows={customers} money />
          <Ranking title="Top 5 port-to-port" rows={lanes} />
        </div>
      )}
      <nav aria-label="Status" className="flex flex-wrap gap-1.5">
        <Chip to={href(params, { status: undefined })} on={!params.status}>
          All
        </Chip>
        {QUOTATION_STATUSES.map((s) => (
          <Chip key={s} to={href(params, { status: s })} on={params.status === s}>
            {QUOTATION_TONE[s][0]}
          </Chip>
        ))}
      </nav>
    </div>
  );
}

function Ranking({ title, rows, money }: { title: string; rows: Ranked[]; money?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <ol className="mt-1 grid gap-0.5">
        {rows.map((r, i) => (
          <li key={r.label} className="flex justify-between gap-2">
            <span>
              <span className="text-muted-foreground">{i + 1}.</span> {r.label}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {r.n}× {money ? ` · ${formatCents(r.valueCents)}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

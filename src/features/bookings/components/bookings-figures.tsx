import Link from "next/link";
import { UrlPicks } from "@/components/shared/url-picks";
import {
  BOOKING_FIGURE_DEFS,
  bookingFigures,
  type BookingFigureKey,
  DEFAULT_BOOKING_FIGURES,
  topDestinations,
} from "@/domain/booking-list";
import { BILL_FILTER_LABEL, BILL_FILTERS, type BillFilter } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import { deltaPercent } from "@/domain/periods";
import { BOOKING_STATUS_META, BOOKING_STATUSES, type BookingStatus } from "@/domain/shipments";
import { cn } from "@/lib/utils";
import type { BookingRow } from "../list-queries";

/** Every query parameter of the list, kept on each chip so a filter adds to the others. */
type Params = Record<string, string | undefined>;

const href = (p: Params, patch: Params) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...patch })) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `/bookings?${qs}` : "/bookings";
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

function Delta({ now, was, cents }: { now: number; was: number; cents: boolean }) {
  const d = deltaPercent(now, was);
  const flat = d === null || d === 0;
  return (
    <span
      className={cn(
        "text-xs",
        flat ? "text-muted-foreground" : d > 0 ? "text-primary" : "text-destructive",
      )}
    >
      {flat ? "–" : d > 0 ? `▲ ${d}%` : `▼ ${-d}%`}{" "}
      <span className="text-muted-foreground">was {cents ? formatCents(was) : was}</span>
    </span>
  );
}

/**
 * The figures of the list as it is filtered (legacy bStatsPanel): the ones chosen, over the
 * period, against the period before when asked; the status and "Invoiced" chips with their
 * counts; the busiest destinations.
 */
export function BookingsFigures({
  all,
  rows,
  before,
  shown,
  params,
  periodLabel,
}: {
  /** The list in every status, for the chips' counts. */
  all: BookingRow[];
  rows: BookingRow[];
  before: BookingRow[] | null;
  shown: readonly BookingFigureKey[];
  params: Params;
  periodLabel: string;
}) {
  const f = bookingFigures(rows);
  const was = before && bookingFigures(before);
  const top = topDestinations(rows);
  const live = all.filter((r) => r.status !== "cancelled");
  const status = params.status as BookingStatus | undefined;
  const billing = params.billing as BillFilter | undefined;
  return (
    <section aria-label={`Figures · ${periodLabel}`} className="mb-4 grid gap-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {BOOKING_FIGURE_DEFS.filter((d) => shown.includes(d.key)).map((d) => (
          <div key={d.key} className="rounded-md border p-2">
            <dt className="text-xs text-muted-foreground">{d.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {d.kind === "cents" ? formatCents(f[d.key]) : f[d.key]}
            </dd>
            {was && <Delta now={f[d.key]} was={was[d.key]} cents={d.kind === "cents"} />}
          </div>
        ))}
      </dl>
      <nav aria-label="Status" className="flex flex-wrap gap-1.5">
        <Chip to={href(params, { status: undefined })} on={!status}>
          All {live.length}
        </Chip>
        {BOOKING_STATUSES.map((s) => {
          const n = all.filter((r) => r.status === s).length;
          if (s === "cancelled" && !n) return null;
          return (
            <Chip key={s} to={href(params, { status: s })} on={status === s}>
              {BOOKING_STATUS_META[s].label}
              {n ? ` ${n}` : ""}
            </Chip>
          );
        })}
      </nav>
      <nav aria-label="Invoiced" className="flex flex-wrap gap-1.5">
        <Chip to={href(params, { billing: undefined })} on={!billing}>
          Invoiced or not
        </Chip>
        {BILL_FILTERS.map((b) => (
          <Chip key={b} to={href(params, { billing: b })} on={billing === b}>
            {BILL_FILTER_LABEL[b]}
          </Chip>
        ))}
      </nav>
      {top.length > 0 && (
        <div className="text-sm">
          <h2 className="mb-1 text-xs font-semibold text-muted-foreground">
            Busiest destinations · {periodLabel}
          </h2>
          <ol className="grid gap-0.5">
            {top.map((t) => (
              <li key={t.label} className="flex justify-between gap-4">
                <span>{t.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {t.n} booking{t.n > 1 ? "s" : ""} · {t.boxes} box{t.boxes === 1 ? "" : "es"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <UrlPicks
        param="figs"
        title="Choose the figures"
        defs={BOOKING_FIGURE_DEFS}
        defaults={DEFAULT_BOOKING_FIGURES}
        shown={shown}
      />
    </section>
  );
}

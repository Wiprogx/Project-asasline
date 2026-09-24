import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/domain/money";
import type { catalogueChoices, getQuotation } from "../queries";
import { AcceptQuotation } from "./accept-quotation";
import { AddLineForm } from "./add-line-form";
import { AddRouteForm } from "./add-route-form";
import { RouteControls } from "./route-controls";
import { RouteLines, routeTotals } from "./route-lines";

type Quotation = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;
type Choices = Awaited<ReturnType<typeof catalogueChoices>>;

/** The booking a destination became, or the button that books it. */
function RouteBooking({
  q,
  routeId,
  canBook,
}: {
  q: Quotation;
  routeId: string;
  canBook: boolean;
}) {
  const b = q.bookings.find((x) => x.quotationRouteId === routeId && x.status !== "cancelled");
  if (b)
    return (
      <Link className="font-mono text-sm hover:underline" href={`/bookings/${b.id}`}>
        → {b.ref}
      </Link>
    );
  return canBook ? <AcceptQuotation id={q.id} version={q.version} routeId={routeId} /> : null;
}

/**
 * The destinations of a quotation, each with its lines and its booking. `choices` is null
 * when the quotation can no longer change (cancelled). Costs only with `costs.view`.
 */
export function QuotationRoutes({
  q,
  showCost,
  canBook,
  choices,
}: {
  q: Quotation;
  showCost: boolean;
  canBook: boolean;
  choices: Choices | null;
}) {
  const edit = choices ? { quotationId: q.id, version: q.version } : null;
  const live = q.routes.filter((r) => !r.declined);
  const all = live.reduce((s, r) => s + routeTotals(r).sell, 0);
  return (
    <div className="grid gap-4">
      {q.routes.map((r) => {
        const booked = q.bookings.some(
          (b) => b.quotationRouteId === r.id && b.status !== "cancelled",
        );
        return (
          <Card key={r.id} className={r.declined ? "opacity-60" : undefined}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <CardTitle className="font-mono">
                {r.pol} → {r.pod}
                {r.finalPlace && (
                  <span className="font-sans text-muted-foreground"> · {r.finalPlace}</span>
                )}
                <span className="ml-2 font-sans text-sm text-muted-foreground">
                  {r.containerType}
                </span>
                {r.declined && (
                  <span className="ml-2 font-sans text-sm text-muted-foreground">
                    Declined — {r.declinedReason}
                  </span>
                )}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {!r.declined && <RouteBooking q={q} routeId={r.id} canBook={canBook} />}
                {edit && <RouteControls {...edit} route={r} booked={booked} />}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <RouteLines route={r} showCost={showCost} edit={r.declined ? null : edit} />
              {edit && choices && !r.declined && (
                <AddLineForm {...edit} routeId={r.id} items={choices.items} showCost={showCost} />
              )}
            </CardContent>
          </Card>
        );
      })}
      {live.length > 1 && (
        <p className="text-right text-sm">
          All {live.length} destinations: <b className="tabular-nums">{formatCents(all)}</b>
        </p>
      )}
      {edit && choices && (
        <Card>
          <CardHeader>
            <h2 className="font-heading text-base font-medium">Another destination</h2>
          </CardHeader>
          <CardContent>
            <AddRouteForm {...edit} lanes={choices.lanes} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

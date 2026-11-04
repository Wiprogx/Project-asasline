import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/domain/money";
import type { catalogueChoices, getQuotation } from "../queries";
import { AcceptQuotation } from "./accept-quotation";
import { AddLineForm } from "./add-line-form";
import { AddRouteForm } from "./add-route-form";
import { RouteControls } from "./route-controls";
import { routeFacts, routeTotals } from "@/domain/quotation-doc";
import { RouteLines } from "./route-lines";
import { type LoadingMode } from "@/domain/loading";
import { ROUTE_SERVICE_FREIGHT } from "@/domain/route-service";

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
  modes,
}: {
  q: Quotation;
  showCost: boolean;
  canBook: boolean;
  choices: Choices | null;
  modes: readonly LoadingMode[];
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
        const facts = routeFacts(r, { carrier: true, transit: true });
        return (
          <Card key={r.id} className={r.declined ? "text-muted-foreground" : undefined}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <CardTitle>
                <span className="mr-2 rounded-sm bg-muted px-1.5 py-0.5 font-sans text-xs font-medium text-muted-foreground">
                  {ROUTE_SERVICE_FREIGHT[r.service]}
                </span>
                {r.polWords} → {r.podWords}
                {r.finalPlace && (
                  <span className="font-sans text-muted-foreground"> · {r.finalPlace}</span>
                )}
                <span className="ml-2 font-sans text-sm text-muted-foreground">
                  {r.containerType}
                  {r.boxes > 1 && ` × ${r.boxes}`}
                </span>
                {r.loadingMode && (
                  <span className="ml-2 font-sans text-sm text-muted-foreground">
                    · {r.loadingMode}
                  </span>
                )}
                {r.declined && (
                  <span className="ml-2 font-sans text-sm text-muted-foreground">
                    Declined — {r.declinedReason}
                  </span>
                )}
              </CardTitle>
              {facts.length > 0 && (
                <p className="basis-full text-sm text-muted-foreground">{facts.join(" · ")}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {!r.declined && <RouteBooking q={q} routeId={r.id} canBook={canBook} />}
                {edit && <RouteControls {...edit} route={r} booked={booked} modes={modes} />}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <RouteLines
                route={r}
                showCost={showCost}
                edit={r.declined ? null : edit}
                inclusive={q.display === "inclusive"}
              />
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
            <AddRouteForm {...edit} lanes={choices.lanes} ports={choices.ports} modes={modes} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

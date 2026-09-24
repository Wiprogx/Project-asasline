import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { formatCents } from "@/domain/money";
import type { getQuotation } from "../queries";
import { AcceptQuotation } from "./accept-quotation";

type Quotation = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;

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

/** Costs are shown only to roles with `costs.view` (legacy "Internal cost" permission). */
export function QuotationRoutes({
  q,
  showCost,
  canBook,
}: {
  q: Quotation;
  showCost: boolean;
  canBook: boolean;
}) {
  return (
    <div className="grid gap-4">
      {q.routes.map((r) => {
        const sell = r.lines.reduce((s, l) => s + (l.sellCents ?? 0) * l.qty, 0);
        const cost = r.lines.reduce((s, l) => s + (l.costCents ?? 0) * l.qty, 0);
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
              </CardTitle>
              {r.declined ? (
                <span className="text-sm text-muted-foreground">Declined</span>
              ) : (
                <RouteBooking q={q} routeId={r.id} canBook={canBook} />
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>VAT</TableHead>
                    <TableHead className="text-right">Sell</TableHead>
                    {showCost && <TableHead className="text-right">Cost</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        {l.qty > 1 ? `${l.qty} × ` : ""}
                        {l.description}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.vatCode}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(l.sellCents)}
                      </TableCell>
                      {showCost && (
                        <TableCell className="text-right tabular-nums">
                          {formatCents(l.costCents)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>
                      Total{showCost && ` · margin ${formatCents(sell - cost)}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCents(sell)}</TableCell>
                    {showCost && (
                      <TableCell className="text-right tabular-nums">{formatCents(cost)}</TableCell>
                    )}
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

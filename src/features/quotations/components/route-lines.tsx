import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/domain/money";
import { PRICE_SOURCE_LABEL, type PriceSource, PRICE_SOURCES } from "@/domain/pricing";
import type { getQuotation } from "../queries";
import { LineControls } from "./line-controls";
import { ListedToggle } from "./presentation-switch";

type Route = NonNullable<Awaited<ReturnType<typeof getQuotation>>>["routes"][number];

const sourceLabel = (s: string | null) =>
  PRICE_SOURCES.includes(s as PriceSource) ? PRICE_SOURCE_LABEL[s as PriceSource] : null;

export const routeTotals = (r: Route) => ({
  sell: r.lines.reduce((s, l) => s + (l.sellCents ?? 0) * l.qty, 0),
  cost: r.lines.reduce((s, l) => s + (l.costCents ?? 0) * l.qty, 0),
});

/** A destination's lines: where each price came from, and the totals. */
export function RouteLines({
  route: r,
  showCost,
  edit,
  inclusive,
}: {
  route: Route;
  showCost: boolean;
  edit: { quotationId: string; version: number } | null;
  /** All-inclusive: show and switch which services the document names. */
  inclusive: boolean;
}) {
  const { sell, cost } = routeTotals(r);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>VAT</TableHead>
          {inclusive && <TableHead>On the document</TableHead>}
          <TableHead className="text-right">Sell</TableHead>
          {showCost && <TableHead className="text-right">Cost</TableHead>}
          {edit && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {r.lines.map((l) => (
          <TableRow key={l.id}>
            <TableCell>
              {l.qty > 1 ? `${l.qty} × ` : ""}
              {l.description}
            </TableCell>
            <TableCell>
              {sourceLabel(l.priceSource) && (
                <ToneBadge tone={l.priceSource === "agreement" ? "info" : "neutral"}>
                  {sourceLabel(l.priceSource)}
                </ToneBadge>
              )}
            </TableCell>
            <TableCell className="font-mono text-xs">{l.vatCode}</TableCell>
            {inclusive && (
              <TableCell>
                {edit ? (
                  <ListedToggle {...edit} lineId={l.id} listed={l.listed} />
                ) : l.listed ? (
                  "Named"
                ) : (
                  "Not named"
                )}
              </TableCell>
            )}
            <TableCell className="text-right tabular-nums">{formatCents(l.sellCents)}</TableCell>
            {showCost && (
              <TableCell className="text-right tabular-nums">{formatCents(l.costCents)}</TableCell>
            )}
            {edit && (
              <TableCell>
                <LineControls {...edit} line={l} showCost={showCost} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={inclusive ? 4 : 3}>
            Total{showCost && ` · margin ${formatCents(sell - cost)}`}
          </TableCell>
          <TableCell className="text-right tabular-nums">{formatCents(sell)}</TableCell>
          {showCost && (
            <TableCell className="text-right tabular-nums">{formatCents(cost)}</TableCell>
          )}
          {edit && <TableCell />}
        </TableRow>
      </TableFooter>
    </Table>
  );
}

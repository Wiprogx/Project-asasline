import { Fragment } from "react";
import { formatCents } from "@/domain/money";
import {
  type PaperDestination,
  type PaperQuotation,
  paperDestinations,
  type PaperTotals,
} from "@/domain/quotation-paper";
import type { QuoteFields } from "@/domain/quote-fields";

const HEAD = "py-1 text-[10px] tracking-wide text-neutral-500 uppercase";
const NUM = "pl-4 text-right align-top tabular-nums whitespace-nowrap";

function DestinationRow({
  d,
  unit,
  price,
}: {
  d: PaperDestination;
  unit: boolean;
  price: boolean;
}) {
  return (
    <tr className="border-t">
      <td className="pt-2 pb-0.5">
        <span className="font-semibold">
          {d.freight && <span className="font-normal text-neutral-500">{d.freight} — </span>}
          {d.title}
        </span>
        {d.facts.length > 0 && <div className="text-neutral-500">{d.facts.join(" · ")}</div>}
        {d.includes.length > 0 && (
          <div className="text-neutral-600">Includes: {d.includes.join(" · ")}</div>
        )}
      </td>
      <td className={`pt-2 pb-0.5 ${NUM}`}>{d.qty}</td>
      {unit && <td />}
      {price && <td className={`pt-2 pb-0.5 font-semibold ${NUM}`}>{formatCents(d.totalCents)}</td>}
    </tr>
  );
}

/**
 * The destinations with their lines (legacy dtab): a destination's title, quantity and price
 * on its row; under it, itemized, each charge with its quantity, unit price and amount; the
 * free-time terms named, never totalled.
 */
export function DestinationsTable({ q, fields }: { q: PaperQuotation; fields: QuoteFields }) {
  const price = fields.price;
  const unit = price && q.display === "itemized";
  const cols = 2 + (unit ? 1 : 0) + (price ? 1 : 0);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className={HEAD}>Destination</th>
          <th className={`${HEAD} pl-4 text-right`}>Quantity</th>
          {unit && <th className={`${HEAD} pl-4 text-right`}>Unit price</th>}
          {price && <th className={`${HEAD} pl-4 text-right`}>Amount</th>}
        </tr>
      </thead>
      <tbody>
        {paperDestinations(q, fields).map((d, i) => (
          <Fragment key={i}>
            <DestinationRow d={d} unit={unit} price={price} />
            {d.lines.map((l, k) => (
              <tr key={k}>
                <td className="py-0.5 pl-4">{l.text}</td>
                <td className={`py-0.5 ${NUM}`}>{l.qty}</td>
                {unit && <td className={`py-0.5 ${NUM}`}>{formatCents(l.unitCents)}</td>}
                {price && <td className={`py-0.5 ${NUM}`}>{formatCents(l.amountCents)}</td>}
              </tr>
            ))}
            {d.terms.map((t) => (
              <tr key={t}>
                <td className="py-0.5 pl-4 text-neutral-600" colSpan={cols}>
                  {t} — terms
                </td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

/** Subtotal, VAT per rate and the total, as the booking confirmation and the invoice show them. */
export function TotalsTable({ t }: { t: PaperTotals }) {
  const rates = t.rates.length ? t.rates : [{ rate: 0, baseCents: t.net, vatCents: 0 }];
  return (
    <table className="ml-auto w-1/2 text-sm">
      <tbody>
        <tr>
          <td>Subtotal</td>
          <td className={NUM}>{formatCents(t.net)}</td>
        </tr>
        {rates.map((r) => (
          <tr key={r.rate}>
            <td>
              VAT {r.rate}%{rates.length > 1 && ` on ${formatCents(r.baseCents)}`}
            </td>
            <td className={NUM}>{formatCents(r.vatCents)}</td>
          </tr>
        ))}
        <tr className="border-t font-bold">
          <td>Total</td>
          <td className={NUM}>{formatCents(t.gross)}</td>
        </tr>
      </tbody>
    </table>
  );
}

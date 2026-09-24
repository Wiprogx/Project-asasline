import { formatCents } from "@/domain/money";
import { QUOTATION_DISPLAY_LABEL, quotationDoc } from "@/domain/quotation-doc";
import type { getQuotation } from "../queries";

type Quotation = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;

/**
 * The quotation as the customer reads it: each destination with its lines and amounts
 * (itemized) or one price naming the services included (all-inclusive). Declined destinations
 * are not on it.
 */
export function QuotationDocument({ q }: { q: Quotation }) {
  const doc = quotationDoc(q.routes, q.display);
  return (
    <section className="grid gap-6 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-neutral-500 uppercase">For</div>
          <div className="font-semibold">{q.client.name}</div>
        </div>
        <div className="text-right">
          <div>
            <span className="text-neutral-500">Valid until</span> {q.validUntil ?? "—"}
          </div>
          <div className="text-neutral-500">{QUOTATION_DISPLAY_LABEL[q.display]} price</div>
        </div>
      </div>
      {doc.routes.map((r, ri) => (
        <div key={ri} className="grid gap-1 border-t pt-3">
          <div className="flex justify-between font-semibold">
            <span>{r.title}</span>
            <span className="tabular-nums">{formatCents(r.totalCents)}</span>
          </div>
          {q.display === "inclusive" && r.lines.length > 0 && (
            <div className="text-neutral-500">Includes:</div>
          )}
          <ul className="grid gap-0.5">
            {r.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 pl-3">
                <span>{l.text}</span>
                {l.amountCents !== null && (
                  <span className="tabular-nums">{formatCents(l.amountCents)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {doc.routes.length > 1 && (
        <div className="flex justify-between border-t-2 pt-3 font-semibold">
          <span>All {doc.routes.length} destinations</span>
          <span className="tabular-nums">{formatCents(doc.totalCents)}</span>
        </div>
      )}
      <p className="text-xs text-neutral-600">
        Prices in EUR, excluding VAT where it applies. Services linked to the export of goods are
        exempt under article 41 of the Belgian VAT Code. Subject to space and equipment availability
        at the time of booking.
      </p>
    </section>
  );
}

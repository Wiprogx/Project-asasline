import type { ReactNode } from "react";
import { invoiceTotals, vatMentions } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import type { getInvoice } from "../queries";

type Invoice = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/**
 * The invoice as the customer reads it: lines, totals per VAT rate, the legal mention of each
 * exempt code, due date and structured reference. Shared by the screen and the print.
 * `lineAction` adds a control per line (remove, on a draft).
 */
export function InvoiceView({
  inv,
  lineAction,
}: {
  inv: Invoice;
  lineAction?: (lineId: string) => ReactNode;
}) {
  const { invoice: i, customer: c, lines } = inv;
  const t = invoiceTotals(lines);
  const sign = i.kind === "credit" ? "−" : "";
  const address = [c.street, [c.zip, c.city].filter(Boolean).join(" "), c.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm">
          <div className="text-xs text-muted-foreground uppercase">Invoiced to</div>
          <div className="font-medium">{c.name}</div>
          {address && <div>{address}</div>}
          {c.vat && <div className="font-mono text-xs">VAT {c.vat}</div>}
        </div>
        <dl className="grid grid-cols-[8rem_1fr] gap-1 text-sm sm:justify-self-end">
          <dt className="text-muted-foreground">Date</dt>
          <dd className="font-mono">{i.issueDate ?? "on issue"}</dd>
          <dt className="text-muted-foreground">Due</dt>
          <dd className="font-mono">{i.dueDate ?? "on issue"}</dd>
          {inv.bookingRef && (
            <>
              <dt className="text-muted-foreground">Shipment</dt>
              <dd className="font-mono">{inv.bookingRef}</dd>
            </>
          )}
          {inv.creditOfNumber && (
            <>
              <dt className="text-muted-foreground">Credits</dt>
              <dd className="font-mono">{inv.creditOfNumber}</dd>
            </>
          )}
        </dl>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Unit</th>
            <th className="py-2 text-right font-medium">VAT</th>
            <th className="py-2 text-right font-medium">Amount</th>
            {lineAction && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b last:border-0">
              <td className="py-2 pr-2">{l.description}</td>
              <td className="py-2 text-right tabular-nums">{l.qty}</td>
              <td className="py-2 text-right tabular-nums">{formatCents(l.unitCents)}</td>
              <td className="py-2 text-right font-mono text-xs">{l.vatCode}</td>
              <td className="py-2 text-right tabular-nums">{formatCents(l.qty * l.unitCents)}</td>
              {lineAction && <td className="py-2 text-right">{lineAction(l.id)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="grid w-full max-w-xs grid-cols-2 gap-1 justify-self-end text-sm">
        <dt className="text-muted-foreground">Net</dt>
        <dd className="text-right tabular-nums">
          {sign}
          {formatCents(t.netCents)}
        </dd>
        {t.rates.map((r) => (
          <div key={r.rate} className="contents">
            <dt className="text-muted-foreground">
              VAT {r.rate}% on {formatCents(r.baseCents)}
            </dt>
            <dd className="text-right tabular-nums">
              {sign}
              {formatCents(r.vatCents)}
            </dd>
          </div>
        ))}
        <dt className="border-t pt-1 font-semibold">Total</dt>
        <dd className="border-t pt-1 text-right font-semibold tabular-nums">
          {sign}
          {formatCents(t.grossCents)}
        </dd>
      </dl>

      <div className="grid gap-1 text-xs text-muted-foreground">
        {vatMentions(lines).map((m) => (
          <p key={m}>{m}</p>
        ))}
        {i.ogm && (
          <p>
            Please pay with the structured reference{" "}
            <span className="font-mono text-foreground">{i.ogm}</span>
          </p>
        )}
        {i.reason && <p>Reason: {i.reason}</p>}
      </div>
    </div>
  );
}

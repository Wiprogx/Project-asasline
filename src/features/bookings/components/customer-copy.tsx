import {
  boxRows,
  boxTitle,
  clientBlock,
  cutOffRows,
  priceTable,
  shipmentRows,
} from "@/domain/booking-doc";
import { formatCents } from "@/domain/money";
import { SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import type { bookingCopy } from "../copy-queries";
import { RowGrid, SheetTitle } from "./copy-parts";

type Copy = NonNullable<Awaited<ReturnType<typeof bookingCopy>>>;

/** The customer copy (legacy preview "client"): the booking confirmed, with its price. */
export function CustomerCopy({ copy: { booking: b, client, price } }: { copy: Copy }) {
  const t = price ? priceTable(price) : null;
  return (
    <section className="grid gap-5 text-sm">
      <div className="text-right text-xs font-bold uppercase">{SHIPMENT_KIND_LABEL[b.kind]}</div>
      <SheetTitle>Booking confirmation</SheetTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] tracking-wide text-neutral-500 uppercase">Customer</div>
          {client && clientBlock(client).map((l) => <div key={l}>{l}</div>)}
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-wide text-neutral-500 uppercase">Booking</div>
          <div className="font-mono">{b.ref}</div>
          {b.quotation && <div className="font-mono text-neutral-500">{b.quotation.ref}</div>}
        </div>
      </div>
      <RowGrid rows={shipmentRows(b)} />
      <RowGrid rows={cutOffRows(b)} />
      <SheetTitle>Containers &amp; goods</SheetTitle>
      {b.containers.map((c, i) => (
        <div key={c.id} className="grid gap-1">
          <div className="font-semibold">{boxTitle(c, i, b.containers.length)}</div>
          <RowGrid rows={boxRows(b, c)} />
        </div>
      ))}
      {t && price && (
        <>
          <SheetTitle>Price</SheetTitle>
          <RowGrid
            cols={4}
            rows={[
              ["Valid until", price.validUntil ?? "—"],
              ["Payment terms", price.paymentTerm ?? "—"],
            ]}
          />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[10px] tracking-wide text-neutral-500 uppercase">
                <th className="py-1">Description</th>
                <th className="py-1 text-right">Quantity</th>
                {t.itemized && <th className="py-1 text-right">Unit price</th>}
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {t.itemized ? (
                t.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-0.5">{l.text}</td>
                    <td className="py-0.5 text-right tabular-nums">{l.qty}</td>
                    <td className="py-0.5 text-right tabular-nums">{formatCents(l.unitCents)}</td>
                    <td className="py-0.5 text-right tabular-nums">{formatCents(l.amountCents)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-0.5">
                    {b.pol} › {b.pod}
                    {t.includes.length > 0 && (
                      <div className="text-neutral-600">Includes: {t.includes.join(" · ")}</div>
                    )}
                  </td>
                  <td className="py-0.5 text-right tabular-nums">
                    {b.containers.length} container(s)
                  </td>
                  <td className="py-0.5 text-right tabular-nums">{formatCents(t.net)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <table className="ml-auto w-1/2 text-sm">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td className="text-right tabular-nums">{formatCents(t.net)}</td>
              </tr>
              {(t.rates.length ? t.rates : [{ rate: 0, baseCents: t.net, vatCents: 0 }]).map(
                (r) => (
                  <tr key={r.rate}>
                    <td>VAT {r.rate}%</td>
                    <td className="text-right tabular-nums">{formatCents(r.vatCents)}</td>
                  </tr>
                ),
              )}
              <tr className="border-t font-bold">
                <td>Total</td>
                <td className="text-right tabular-nums">{formatCents(t.gross)}</td>
              </tr>
            </tbody>
          </table>
          {t.mentions.map((m) => (
            <p key={m} className="text-xs text-neutral-600">
              {m}
            </p>
          ))}
        </>
      )}
    </section>
  );
}

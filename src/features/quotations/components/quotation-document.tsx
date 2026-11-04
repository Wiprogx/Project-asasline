import { RowGrid, SheetTitle } from "@/components/shared/sheet-parts";
import { clientBlock } from "@/domain/booking-doc";
import { QUOTATION_DISPLAY_LABEL } from "@/domain/quotation-doc";
import {
  loadingRows,
  PAPER_NOTE,
  type PaperContact,
  paperHead,
  paperMentions,
  type PaperQuotation,
  paperTotals,
} from "@/domain/quotation-paper";
import { DEFAULT_QUOTE_FIELDS, type QuoteFields } from "@/domain/quote-fields";
import { SHIPMENT_KIND_LABEL } from "@/domain/shipments";
import { DestinationsTable, TotalsTable } from "./quotation-paper-table";

/**
 * The quotation as the customer reads it (legacy quoteDoc), laid out as the booking
 * confirmation: the customer and the quotation's facts, where the boxes are collected, then
 * each destination with its lines — itemized, or one price naming the services included — the
 * totals, the VAT mentions and the terms. Declined destinations are not on it.
 */
export function QuotationDocument({
  paper: q,
  fields = DEFAULT_QUOTE_FIELDS,
  contact = null,
}: {
  paper: PaperQuotation;
  /** What the office shows on the paper (Settings › Quotation document). */
  fields?: QuoteFields;
  /** The sales contact printed when the office shows one. */
  contact?: PaperContact;
}) {
  const mentions = fields.terms ? paperMentions(q) : [];
  return (
    <section className="grid gap-5 text-sm">
      <div className="text-right text-xs font-bold uppercase">{SHIPMENT_KIND_LABEL[q.kind]}</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] tracking-wide text-neutral-500 uppercase">Customer</div>
          {clientBlock(q.client).map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-wide text-neutral-500 uppercase">Quotation</div>
          <div className="font-mono">{q.ref}</div>
          {fields.price && (
            <div className="text-neutral-500">{QUOTATION_DISPLAY_LABEL[q.display]} price</div>
          )}
        </div>
      </div>
      <RowGrid rows={paperHead(q, fields, contact)} />
      <SheetTitle>{q.kind === "import" ? "Delivery" : "Loading"}</SheetTitle>
      <RowGrid cols={2} rows={loadingRows(q)} />
      <SheetTitle>{fields.price ? "Price" : "Services"}</SheetTitle>
      <DestinationsTable q={q} fields={fields} />
      {fields.price && <TotalsTable t={paperTotals(q)} />}
      {fields.terms && (
        <p className="text-xs text-neutral-600">
          Prices in EUR, excluding VAT.
          {mentions.map((m) => (
            <span key={m}> {m}.</span>
          ))}
        </p>
      )}
      <p className="text-xs text-neutral-600">{PAPER_NOTE}</p>
    </section>
  );
}

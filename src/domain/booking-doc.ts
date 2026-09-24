/**
 * The booking as its readers see it on paper (legacy preview(b, kind)): the customer copy,
 * with the price, and the trucker copy, one box per driver and no price. Nothing is inherited
 * from another box: a detail not agreed prints as missing, so the copy will not go out with
 * another box's address or hour on it (legacy 1أ.10).
 */
import { invoiceTotals, vatMentions } from "./invoicing";
import { type QuotationDisplay, quotationDoc } from "./quotation-doc";
import type { ShipmentKind } from "./shipments";

export type CopyBooking = {
  ref: string;
  kind: ShipmentKind;
  pol: string | null;
  pod: string | null;
  loadAddress: string | null;
  loadDate: string | null;
  loadTime: string | null;
  carrierBookingNo: string | null;
  blNo: string | null;
  vesselName: string | null;
  voyage: string | null;
  etd: string | null;
  eta: string | null;
  customsClosing: string | null;
  vgmClosing: string | null;
  siClosing: string | null;
  portCutOff: string | null;
  docType: string;
  commodity: string | null;
};

export type CopyClient = {
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  vat: string | null;
  eori: string | null;
  phone: string | null;
  email: string | null;
};

export type CopyBox = {
  number: string | null;
  type: string;
  seals: readonly string[];
  tareKg: number | null;
  cargoKg: number | null;
};

export type CopyPrice = {
  display: QuotationDisplay;
  validUntil: string | null;
  paymentTerm: string | null;
  lines: readonly {
    description: string;
    qty: number;
    sellCents: number | null;
    vatCode: string;
    listed: boolean;
  }[];
};

export type Row = [label: string, value: string];
const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

/** "Unloading address" on an import, "Loading address" otherwise (legacy addrLbl). */
export const addressLabel = (kind: ShipmentKind) =>
  kind === "import" ? "Unloading address" : "Loading address";

export const clientBlock = (c: CopyClient) =>
  [
    c.name,
    c.street,
    [c.zip, c.city].filter(Boolean).join(" ") || null,
    c.vat && `VAT ${c.vat}`,
    c.eori && `EORI ${c.eori}`,
  ].filter((x): x is string => !!x);

export function shipmentRows(b: CopyBooking): Row[] {
  return [
    ["Route", b.pol || b.pod ? `${dash(b.pol)} › ${dash(b.pod)}` : "—"],
    [addressLabel(b.kind), dash(b.loadAddress)],
    ["Loading date", [b.loadDate, b.loadTime].filter(Boolean).join(" ") || "—"],
    ["Document type", dash(b.docType)],
    ["Shipping line booking", dash(b.carrierBookingNo)],
    ["Vessel · voyage", [b.vesselName, b.voyage].filter(Boolean).join(" · ") || "—"],
    ["ETD", dash(b.etd)],
    ["ETA", dash(b.eta)],
  ];
}

export function cutOffRows(b: CopyBooking): Row[] {
  return [
    ["Port cut-off", dash(b.portCutOff)],
    ["VGM closing", dash(b.vgmClosing)],
    ["Customs closing", dash(b.customsClosing)],
    ["SI & doc closing", dash(b.siClosing)],
  ];
}

export const boxTitle = (box: CopyBox, i: number, n: number) =>
  `${n > 1 ? `Container ${i + 1} of ${n}` : "Container"} — ${box.number ?? "number to follow"}`;

export function boxRows(b: CopyBooking, box: CopyBox): Row[] {
  return [
    ["Type", box.type],
    ["Seal", box.seals.length ? box.seals[box.seals.length - 1] : "—"],
    ["Commodity", dash(b.commodity)],
    ["Cargo weight", box.cargoKg === null ? "—" : `${box.cargoKg.toLocaleString("en")} kg`],
    ["Tare", box.tareKg === null ? "—" : `${box.tareKg.toLocaleString("en")} kg`],
  ];
}

export type PriceTable = {
  itemized: boolean;
  lines: { text: string; qty: number; unitCents: number; amountCents: number }[];
  includes: string[];
  net: number;
  rates: { rate: number; baseCents: number; vatCents: number }[];
  vat: number;
  gross: number;
  mentions: string[];
};

/** The price on the customer copy: the booking's destination on the quotation, as it chose to show it. */
export function priceTable(p: CopyPrice): PriceTable {
  const totals = invoiceTotals(
    p.lines.map((l) => ({ qty: l.qty, unitCents: l.sellCents ?? 0, vatCode: l.vatCode })),
  );
  const doc = quotationDoc(
    [{ pol: "", pod: "", finalPlace: null, containerType: null, declined: false, lines: p.lines }],
    p.display,
  );
  return {
    itemized: p.display === "itemized",
    lines: p.lines.map((l) => ({
      text: l.description,
      qty: l.qty,
      unitCents: l.sellCents ?? 0,
      amountCents: (l.sellCents ?? 0) * l.qty,
    })),
    includes: doc.routes[0]?.lines.map((l) => l.text) ?? [],
    net: totals.netCents,
    rates: totals.rates,
    vat: totals.vatCents,
    gross: totals.grossCents,
    mentions: vatMentions(
      p.lines.map((l) => ({ qty: l.qty, unitCents: l.sellCents ?? 0, vatCode: l.vatCode })),
    ),
  };
}

/** The boxes on a trucker copy: one driver, one box — unless the office asks for all. */
export const boxesFor = (boxes: readonly CopyBox[], which: number | null) =>
  which === null
    ? boxes.map((box, i) => ({ box, i }))
    : boxes[which]
      ? [{ box: boxes[which], i: which }]
      : [];

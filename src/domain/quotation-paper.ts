/**
 * The printed quotation (legacy quoteDoc), laid out as the booking confirmation is, so the two
 * papers read alike: the facts at the top, the customer, where and how the boxes are collected,
 * then each destination with its lines, the totals and the terms. The office's switches
 * (Settings › Quotation document) say what is shown; declined destinations are left out.
 */
import { addressLabel, type CopyClient, type Row } from "./booking-doc";
import { invoiceTotals, vatMentions } from "./invoicing";
import {
  type DocLine,
  type DocRoute,
  lineAmount,
  type QuotationDisplay,
  routeFacts,
  routeTitle,
} from "./quotation-doc";
import type { QuoteFields } from "./quote-fields";
import { ROUTE_SERVICE_FREIGHT } from "./route-service";
import type { ShipmentKind } from "./shipments";

/**
 * A stop on the way: the place in full (placeBlock), the day and hour the truck is expected —
 * the box delivered, under a drop mode — ("2026-11-12 08:00"), how the box is handled there and,
 * dropped, when it is picked back.
 */
export type PaperStop = {
  place: string;
  when: string | null;
  mode: string | null;
  pickedBack: string | null;
};

/** One container's loading as the paper says it, in words the query resolved. */
export type PaperBox = {
  loadingMode: string | null;
  loadAddress: string | null;
  /** The stops on the way: each place printed as the loading address is, and when the truck is expected there. */
  stops: readonly PaperStop[];
  /** The box is left on site (a drop mode): its moment is "Delivered on", else "Loading on". */
  dropped?: boolean;
  /** When the box is loaded — put down, under a drop mode — "2026-11-12 08:00"; dropped, when it is picked back. */
  delivered?: string | null;
  pickedBack?: string | null;
};

export type PaperRoute = Omit<DocRoute, "lines"> & {
  lines: readonly (DocLine & { vatCode: string })[];
  /** One per container quoted; a box without details of its own carries the destination's. */
  boxDetails: readonly PaperBox[];
};

export type PaperQuotation = {
  ref: string;
  /** The day it was made, "YYYY-MM-DD" in the office's zone. */
  day: string;
  validUntil: string | null;
  kind: ShipmentKind;
  display: QuotationDisplay;
  paymentTerm: string | null;
  docType: string | null;
  commodity: string | null;
  client: CopyClient;
  routes: readonly PaperRoute[];
};

export type PaperContact = { name: string; email: string } | null;

/** Said at the foot of every quotation (legacy quoteDoc's last box). */
export const PAPER_NOTE =
  "Rates are valid for the stated period and subject to space and equipment being available at the time of booking.";

export const PORT_TO_PORT = "Port to port — no inland transport";

/** A place of the customer as the query reads it: a location contact and what the driver needs. */
export type PaperPlace = {
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  /** The country's name ("Belgium"). */
  country: string | null;
  mobile: string | null;
  instructions: string | null;
  note: string | null;
};

/**
 * The loading address as the paper prints it, one line each: the name, the street, the city
 * with its postal code and country, then the mobile, the instructions and the note when the
 * place has them.
 */
export const placeBlock = (p: PaperPlace) =>
  [
    p.name,
    p.street,
    [p.city, p.zip, p.country].filter(Boolean).join(" ") || null,
    p.mobile && `Mobile: ${p.mobile}`,
    p.instructions && `Instructions: ${p.instructions}`,
    p.note && `Note: ${p.note}`,
  ]
    .filter((x): x is string => !!x)
    .join("\n");

const dash = (v: string | null | undefined) => v || "—";
const live = (q: PaperQuotation) => q.routes.filter((r) => !r.declined);
const boxCount = (r: PaperRoute) => Math.max(1, r.boxes);

/** The facts at the top (legacy f4 row), each only when the office shows it. */
export function paperHead(q: PaperQuotation, fields: QuoteFields, contact: PaperContact): Row[] {
  return [
    ["Date", q.day],
    ...(fields.validity ? [["Valid until", dash(q.validUntil)] as Row] : []),
    ["Payment terms", dash(q.paymentTerm)],
    ["Document type", dash(q.docType)],
    ...(fields.contact && contact
      ? [["Sales contact", `${contact.name} · ${contact.email}`] as Row]
      : []),
    ...(q.commodity ? [["Commodity", q.commodity] as Row] : []),
  ];
}

/** One value when every item says the same; else each named ("Container 2 — …"), one per line. */
function grouped<T>(
  items: readonly T[],
  get: (x: T) => string | null,
  name: (x: T, i: number) => string,
) {
  const rows = items.map((x, i) => ({ i, x, v: get(x) })).filter((r) => r.v);
  if (!rows.length) return null;
  if (rows.length === items.length && rows.every((r) => r.v === rows[0].v)) return rows[0].v;
  return rows.map((r) => `${name(r.x, r.i)} — ${r.v}`).join("\n");
}

const perBox = (r: PaperRoute, get: (b: PaperBox) => string | null) =>
  grouped(r.boxDetails, get, (_, i) => `Container ${i + 1}`);

const perRoute = (routes: readonly PaperRoute[], get: (r: PaperRoute) => string | null) =>
  grouped(routes, get, (r) => r.pod || routeTitle(r, true));

/**
 * Each stop on the way as its own pair of rows — the place printed as the loading address is
 * (name, street, city, mobile…), and beside it when the truck is expected and how the box is
 * handled there — named by its container when the destination has several, by its destination
 * when there are several.
 */
function stopRows(doors: readonly PaperRoute[]): Row[] {
  const many = doors.length > 1;
  return doors.flatMap((r) =>
    r.boxDetails.flatMap((b, i) =>
      b.stops.flatMap((s, k): Row[] => {
        const name = [
          many ? r.pod || routeTitle(r, true) : null,
          boxCount(r) > 1 ? `Container ${i + 1}` : null,
          `Stop ${k + 1}`,
        ]
          .filter(Boolean)
          .join(" · ");
        return [
          [name, s.place || "To be advised"],
          [
            `${name} — when and how`,
            [s.when, s.mode, s.pickedBack && `Picked back on ${s.pickedBack}`]
              .filter(Boolean)
              .join("\n") || "—",
          ],
        ];
      }),
    ),
  );
}

/**
 * Where the boxes are collected, how, and the stops on the way (legacy loadingHeader): said
 * once at the top, grouped by field as the booking confirmation does — not inside the prices.
 */
export function loadingRows(q: PaperQuotation): Row[] {
  const routes = live(q);
  const doors = routes.filter((r) => r.service === "door_port");
  if (!doors.length) return [["Service", PORT_TO_PORT]];
  const addresses = perRoute(routes, (r) =>
    r.service === "door_port" ? (perBox(r, (b) => b.loadAddress) ?? "To be advised") : PORT_TO_PORT,
  );
  const modes = perRoute(doors, (r) => perBox(r, (b) => b.loadingMode));
  // A drop mode's moments, agreed here as the booking will ask them.
  const loadingOn = perRoute(doors, (r) =>
    perBox(r, (b) => (b.dropped ? null : (b.delivered ?? null))),
  );
  const delivered = perRoute(doors, (r) =>
    perBox(r, (b) => (b.dropped ? (b.delivered ?? null) : null)),
  );
  const pickedBack = perRoute(doors, (r) => perBox(r, (b) => b.pickedBack ?? null));
  return [
    [addressLabel(q.kind), addresses ?? "To be advised"],
    ...(modes ? [["Loading mode", modes] as Row] : []),
    ...(loadingOn ? [["Loading on", loadingOn] as Row] : []),
    ...(delivered ? [["Delivered on", delivered] as Row] : []),
    ...(pickedBack ? [["Picked back on", pickedBack] as Row] : []),
    ...stopRows(doors),
  ];
}

export type PaperLine = { text: string; qty: number; unitCents: number; amountCents: number };

export type PaperDestination = {
  freight: string | null;
  title: string;
  facts: string[];
  /** "2 × 40HC" */
  qty: string;
  totalCents: number;
  /** Itemized: every charge with its quantity, unit price and amount. */
  lines: PaperLine[];
  /** All-inclusive: the services named, without a price. */
  includes: string[];
  /** Free-time terms, named and never totalled. */
  terms: string[];
};

/** Each destination as the table shows it, the lines as the quotation chose to present them. */
export function paperDestinations(q: PaperQuotation, fields: QuoteFields): PaperDestination[] {
  const itemized = q.display === "itemized";
  return live(q).map((r) => {
    const n = boxCount(r);
    const charges = r.lines.filter((l) => !l.condition);
    const terms = r.lines.filter((l) => l.condition);
    const shown = (ls: typeof charges) => (itemized ? ls : ls.filter((l) => l.listed));
    return {
      freight: r.service ? ROUTE_SERVICE_FREIGHT[r.service] : null,
      title: routeTitle(r),
      facts: routeFacts(r, { transit: fields.transit }),
      qty: `${n} × ${r.containerType ?? "container"}`,
      totalCents: charges.reduce((s, l) => s + lineAmount(l, n), 0),
      lines:
        itemized && fields.services
          ? charges.map((l) => ({
              text: l.description,
              qty: l.qty * (l.perBox ? n : 1),
              unitCents: l.sellCents ?? 0,
              amountCents: lineAmount(l, n),
            }))
          : [],
      includes: !itemized && fields.services ? shown(charges).map((l) => l.description) : [],
      terms: fields.freetime ? shown(terms).map((l) => l.description) : [],
    };
  });
}

export type PaperTotals = {
  net: number;
  rates: { rate: number; baseCents: number; vatCents: number }[];
  vat: number;
  gross: number;
};

const chargesOf = (q: PaperQuotation) =>
  live(q).flatMap((r) =>
    r.lines
      .filter((l) => !l.condition)
      .map((l) => ({
        qty: l.qty * (l.perBox ? boxCount(r) : 1),
        unitCents: l.sellCents ?? 0,
        vatCode: l.vatCode,
      })),
  );

/** Subtotal, VAT per rate and total over every live destination (legacy tot). */
export function paperTotals(q: PaperQuotation): PaperTotals {
  const t = invoiceTotals(chargesOf(q));
  return { net: t.netCents, rates: t.rates, vat: t.vatCents, gross: t.grossCents };
}

/** The VAT mentions the lines' codes ask for ("Exempt — article 41 …"), once each. */
export const paperMentions = (q: PaperQuotation) => vatMentions(chargesOf(q));

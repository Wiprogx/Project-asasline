import { describe, expect, it } from "vitest";
import {
  loadingRows,
  paperDestinations,
  paperHead,
  paperMentions,
  placeBlock,
  type PaperQuotation,
  type PaperRoute,
  paperTotals,
  PORT_TO_PORT,
} from "./quotation-paper";
import { DEFAULT_QUOTE_FIELDS } from "./quote-fields";

const line = (
  description: string,
  sellCents: number,
  extra: Partial<PaperRoute["lines"][number]> = {},
): PaperRoute["lines"][number] => ({
  description,
  qty: 1,
  sellCents,
  listed: true,
  perBox: true,
  condition: false,
  vatCode: "EX41",
  ...extra,
});

const route = (over: Partial<PaperRoute> = {}): PaperRoute => ({
  pol: "BEANR",
  pod: "CMDLA",
  polWords: "Antwerp (BE) (BEANR)",
  podWords: "Douala (CM) (CMDLA)",
  service: "door_port",
  carrier: "CMA CGM",
  transitDays: 22,
  finalPlace: null,
  containerType: "40HC",
  boxes: 2,
  declined: false,
  lines: [
    line("Ocean freight", 425000),
    line("Terminal handling", 21000, { listed: false, perBox: false }),
    line("14 free days at destination", 0, { condition: true }),
  ],
  boxDetails: [
    {
      loadingMode: "Direct loading — 2 hours",
      loadAddress: "Warehouse, Kaai 12, Zeebrugge",
      stops: [],
    },
    {
      loadingMode: "Direct loading — 2 hours",
      loadAddress: "Warehouse, Kaai 12, Zeebrugge",
      stops: ["Depot, Industrieweg 5, Brugge · 2026-11-12"],
    },
  ],
  ...over,
});

const quotation = (routes: PaperRoute[], over: Partial<PaperQuotation> = {}): PaperQuotation => ({
  ref: "QT2611003",
  day: "2026-11-04",
  validUntil: "2026-11-30",
  kind: "export",
  display: "itemized",
  paymentTerm: "30 days",
  docType: "SEA WAYBILL",
  commodity: "630900 Worn clothes",
  client: {
    name: "Maison Dupont",
    street: "Rue Haute 1",
    zip: "1000",
    city: "Bruxelles",
    vat: "BE0123456749",
    eori: null,
    phone: null,
    email: null,
  },
  routes,
  ...over,
});

const F = DEFAULT_QUOTE_FIELDS;
const contact = { name: "Nadia", email: "nadia@asasline.com" };

describe("the printed quotation", () => {
  it("heads the paper with its facts, each only when the office shows it", () => {
    const q = quotation([route()]);
    expect(paperHead(q, F, contact).map(([k]) => k)).toEqual([
      "Date",
      "Valid until",
      "Payment terms",
      "Document type",
      "Sales contact",
      "Commodity",
    ]);
    expect(
      paperHead(q, { ...F, validity: false, contact: false }, contact).map(([k]) => k),
    ).toEqual(["Date", "Payment terms", "Document type", "Commodity"]);
    expect(paperHead(quotation([route()], { paymentTerm: null }), F, null)).toContainEqual([
      "Payment terms",
      "—",
    ]);
  });

  it("says port to port when no destination is collected at the door", () => {
    expect(loadingRows(quotation([route({ service: "port_port" })]))).toEqual([
      ["Service", PORT_TO_PORT],
    ]);
  });

  it("says the loading once when every box agrees, and per container when they differ", () => {
    const rows = loadingRows(quotation([route()]));
    expect(rows).toEqual([
      ["Loading address", "Warehouse, Kaai 12, Zeebrugge"],
      ["Loading mode", "Direct loading — 2 hours"],
      ["Additional stops", "Container 2 · Stop 1: Depot, Industrieweg 5, Brugge · 2026-11-12"],
    ]);
    const differ = route({
      boxDetails: [
        { loadingMode: "Direct loading — 2 hours", loadAddress: "Warehouse, Zeebrugge", stops: [] },
        { loadingMode: "Drop off container on ground", loadAddress: "Depot, Brugge", stops: [] },
      ],
    });
    expect(loadingRows(quotation([differ]))).toEqual([
      ["Loading address", "Container 1 — Warehouse, Zeebrugge\nContainer 2 — Depot, Brugge"],
      [
        "Loading mode",
        "Container 1 — Direct loading — 2 hours\nContainer 2 — Drop off container on ground",
      ],
    ]);
  });

  it("names each destination's loading by its port when two destinations differ", () => {
    const q = quotation([
      route(),
      route({
        pod: "TRMER",
        boxes: 1,
        boxDetails: [{ loadingMode: null, loadAddress: null, stops: [] }],
      }),
    ]);
    expect(loadingRows(q)[0]).toEqual([
      "Loading address",
      "CMDLA — Warehouse, Kaai 12, Zeebrugge\nTRMER — To be advised",
    ]);
  });

  it("prints a loading address as its name, street, city, mobile, instructions and note", () => {
    expect(
      placeBlock({
        name: "Warehouse Dupont",
        street: "Kaai 12",
        zip: "8380",
        city: "Zeebrugge",
        country: "Belgium",
        mobile: "+32 470 00 00 00",
        instructions: "Gate 3, ask for Jan",
        note: "Closed on Fridays",
      }),
    ).toBe(
      "Warehouse Dupont\nKaai 12\nZeebrugge 8380 Belgium\nMobile: +32 470 00 00 00\nInstructions: Gate 3, ask for Jan\nNote: Closed on Fridays",
    );
    expect(
      placeBlock({
        name: "Depot",
        street: null,
        zip: null,
        city: "Brugge",
        country: null,
        mobile: null,
        instructions: null,
        note: null,
      }),
    ).toBe("Depot\nBrugge");
  });

  it("calls the address an unloading address on an import", () => {
    expect(loadingRows(quotation([route()], { kind: "import" }))[0][0]).toBe("Unloading address");
  });

  it("itemizes every charge with its quantity, unit price and amount, the terms named apart", () => {
    const [d] = paperDestinations(quotation([route()]), F);
    expect(d.title).toBe("Antwerp (BE) (BEANR) › Douala (CM) (CMDLA) · 40HC × 2");
    expect(d.freight).toBe("Inland transport + ocean freight");
    expect(d.facts).toEqual(["22 days transit"]);
    expect(d.qty).toBe("2 × 40HC");
    expect(d.lines).toEqual([
      { text: "Ocean freight", qty: 2, unitCents: 425000, amountCents: 850000 },
      { text: "Terminal handling", qty: 1, unitCents: 21000, amountCents: 21000 },
    ]);
    expect(d.terms).toEqual(["14 free days at destination"]);
    expect(d.includes).toEqual([]);
    expect(d.totalCents).toBe(871000);
  });

  it("names only the listed services on an all-inclusive quotation, at one price", () => {
    const [d] = paperDestinations(quotation([route()], { display: "inclusive" }), F);
    expect(d.lines).toEqual([]);
    expect(d.includes).toEqual(["Ocean freight"]);
    expect(d.terms).toEqual(["14 free days at destination"]);
    expect(d.totalCents).toBe(871000);
  });

  it("hides the services, the terms and the transit when the office says so", () => {
    const off = { ...F, services: false, freetime: false, transit: false };
    const [d] = paperDestinations(quotation([route()]), off);
    expect(d.lines).toEqual([]);
    expect(d.terms).toEqual([]);
    expect(d.facts).toEqual([]);
    const [i] = paperDestinations(quotation([route()], { display: "inclusive" }), off);
    expect(i.includes).toEqual([]);
  });

  it("leaves a declined destination off the paper", () => {
    const q = quotation([route(), route({ declined: true, pod: "TRMER" })]);
    expect(paperDestinations(q, F)).toHaveLength(1);
    expect(paperTotals(q).gross).toBe(871000);
  });

  it("totals the charges per VAT rate and names the mentions their codes ask for", () => {
    const q = quotation([
      route({
        lines: [
          line("Ocean freight", 100000),
          line("Local charge", 10000, { vatCode: "S21", perBox: false }),
        ],
      }),
    ]);
    const t = paperTotals(q);
    expect(t.net).toBe(210000);
    expect(t.rates).toHaveLength(2);
    expect(t.rates).toContainEqual({ rate: 0, baseCents: 200000, vatCents: 0 });
    expect(t.rates).toContainEqual({ rate: 21, baseCents: 10000, vatCents: 2100 });
    expect(t.gross).toBe(212100);
    expect(paperMentions(q)).toEqual([
      "Exempt — article 41 of the Belgian VAT Code (services linked to the export of goods)",
    ]);
  });
});

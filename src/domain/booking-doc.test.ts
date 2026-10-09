import { describe, expect, it } from "vitest";
import {
  addressLabel,
  boxRows,
  boxesFor,
  clientBlock,
  type CopyBooking,
  type CopyBox,
  copyGaps,
  loadingRows,
  priceTable,
  shipmentRows,
} from "./booking-doc";

/** A box that says nothing about its loading yet. */
const bare = (number: string | null): CopyBox => ({
  number,
  type: "40HC",
  seals: [],
  tareKg: null,
  cargoKg: null,
  loadAddress: null,
  loadDate: null,
  loadTime: null,
  loadingMode: null,
  transporter: null,
  pickBackDate: null,
  pickBackTime: null,
  stops: [],
});

const booking: CopyBooking = {
  ref: "SB2609001",
  kind: "export",
  pol: "BEANR",
  pod: "CMDLA",
  loadAddress: null,
  loadDate: "2026-10-02",
  loadTime: null,
  loadingMode: null,
  carrierBookingNo: null,
  blNo: null,
  vesselName: "MSC ROMA",
  voyage: "FA534A",
  etd: "2026-10-09",
  eta: null,
  customsClosing: null,
  vgmClosing: null,
  siClosing: null,
  portCutOff: null,
  docType: "SEA WAYBILL",
  commodity: null,
};

describe("the copies", () => {
  it("print a missing detail as missing, never another box's", () => {
    const rows = Object.fromEntries(shipmentRows(booking));
    expect(rows["Loading address"]).toBe("—");
    expect(rows["Vessel · voyage"]).toBe("MSC ROMA · FA534A");
    expect(boxRows(booking, bare(null))).toContainEqual(["Seal", "—"]);
  });
  it("tell the driver where this box loads, its stops and its pick-up, and what is still missing", () => {
    const box: CopyBox = {
      ...bare("MSKU1234567"),
      loadAddress: "Quay 730, Antwerp",
      loadDate: "2026-10-03",
      loadTime: "07:30",
      loadingMode: "Drop off container on ground",
      transporter: "Transports Dupont",
      pickBackDate: "2026-10-05",
      pickBackTime: "16:00",
      stops: [{ address: "Depot Zeebrugge", date: "2026-10-04", time: null }],
    };
    const rows = Object.fromEntries(loadingRows(booking, box, 2));
    expect(rows["Loading address"]).toBe("Quay 730, Antwerp");
    expect(rows["Loading date"]).toBe("2026-10-03 07:30");
    expect(rows["Loading mode"]).toBe("Drop off container on ground");
    expect(rows["Trucker"]).toBe("Transports Dupont");
    expect(rows["Stop 1"]).toBe("Depot Zeebrugge · 2026-10-04");
    expect(rows["Picked back up"]).toBe("2026-10-05 16:00");
    expect(copyGaps(booking, box, 2)).toEqual([]);
    // the second box inherits nothing from the first, not even the booking's date
    expect(copyGaps(booking, bare(null), 2)).toEqual([
      "loading address",
      "loading date",
      "loading mode",
      "container number",
    ]);
  });
  it("say unloading on an import", () => {
    expect(addressLabel("import")).toBe("Unloading address");
    expect(addressLabel("export")).toBe("Loading address");
  });
  it("write the customer with only what it has", () => {
    expect(
      clientBlock({
        name: "Os Textile",
        street: null,
        zip: "1070",
        city: "Bruxelles",
        vat: "BE0123456749",
        eori: null,
        phone: null,
        email: null,
      }),
    ).toEqual(["Os Textile", "1070 Bruxelles", "VAT BE0123456749"]);
  });
});

describe("priceTable", () => {
  const lines = [
    { description: "Ocean freight", qty: 2, sellCents: 425_000, vatCode: "EX41", listed: true },
    { description: "THC", qty: 1, sellCents: 21_000, vatCode: "EX41", listed: false },
  ];
  it("totals the lines and carries the exemption mention", () => {
    const t = priceTable({ display: "itemized", validUntil: null, paymentTerm: null, lines });
    expect(t.net).toBe(871_000);
    expect(t.vat).toBe(0);
    expect(t.mentions[0]).toMatch(/article 41/);
    expect(t.lines[0].amountCents).toBe(850_000);
  });
  it("names only the listed services when all-inclusive", () => {
    const t = priceTable({ display: "inclusive", validUntil: null, paymentTerm: null, lines });
    expect(t.itemized).toBe(false);
    expect(t.includes).toEqual(["2 × Ocean freight"]);
  });
});

describe("boxesFor", () => {
  const boxes = [bare("MSKU1234567"), bare(null)];
  it("gives one driver one box, keeping its number in the shipment", () => {
    expect(boxesFor(boxes, 1)).toEqual([{ box: boxes[1], i: 1 }]);
    expect(boxesFor(boxes, 5)).toEqual([]);
    expect(boxesFor(boxes, null)).toHaveLength(2);
  });
});

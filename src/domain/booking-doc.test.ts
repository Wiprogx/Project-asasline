import { describe, expect, it } from "vitest";
import {
  addressLabel,
  boxRows,
  boxesFor,
  clientBlock,
  type CopyBooking,
  priceTable,
  shipmentRows,
} from "./booking-doc";

const booking: CopyBooking = {
  ref: "SB2609001",
  kind: "export",
  pol: "BEANR",
  pod: "CMDLA",
  loadAddress: null,
  loadDate: "2026-10-02",
  loadTime: null,
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
    expect(
      boxRows(booking, { number: null, type: "40HC", seals: [], tareKg: null, cargoKg: null }),
    ).toContainEqual(["Seal", "—"]);
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
  const boxes = [
    { number: "MSKU1234567", type: "40HC", seals: [], tareKg: null, cargoKg: null },
    { number: null, type: "40HC", seals: [], tareKg: null, cargoKg: null },
  ];
  it("gives one driver one box, keeping its number in the shipment", () => {
    expect(boxesFor(boxes, 1)).toEqual([{ box: boxes[1], i: 1 }]);
    expect(boxesFor(boxes, 5)).toEqual([]);
    expect(boxesFor(boxes, null)).toHaveLength(2);
  });
});

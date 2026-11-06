import { describe, expect, it } from "vitest";
import {
  addressLabel,
  boxRows,
  boxesFor,
  clientBlock,
  type CopyBooking,
  type CopyBox,
  priceTable,
  shipmentRows,
} from "./booking-doc";
import { copyGaps, customerLoadingRows, loadingRows, truckerBoxRows } from "./booking-loading-doc";
import { DEFAULT_LOADING_MODES } from "./loading";

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
  hsLines: [],
  packages: null,
  packageType: null,
  blDescription: null,
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
  pickupDepot: null,
  pickupDate: null,
  terminal: "PSA 913, Antwerp",
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
    expect(rows["Vessel · voyage"]).toBe("MSC ROMA · FA534A");
    expect(boxRows(booking, bare(null))).toContainEqual(["Seal", "—"]);
    // two boxes: the booking's loading date is not either box's
    const loading = Object.fromEntries(loadingRows(booking, bare(null), 2));
    expect(loading["Loading address"]).toBe("—");
    expect(loading["Loading date"]).toBe("—");
    expect(loading["Terminal"]).toBe("PSA 913, Antwerp");
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
      stops: [
        {
          address: "Depot Zeebrugge",
          date: "2026-10-04",
          time: null,
          loadingMode: "Disconnect chassis",
          pickBackDate: "2026-10-06",
          pickBackTime: "10:00",
        },
      ],
    };
    const rows = Object.fromEntries(loadingRows(booking, box, 2, DEFAULT_LOADING_MODES));
    expect(rows["Loading address"]).toBe("Quay 730, Antwerp");
    // a drop mode: the box is delivered, not loaded
    expect(rows["Delivered on"]).toBe("2026-10-03 07:30");
    expect(rows["Loading date"]).toBeUndefined();
    expect(rows["Loading mode"]).toBe("Drop off container on ground");
    expect(rows["Trucker"]).toBe("Transports Dupont");
    expect(rows["Terminal"]).toBe("PSA 913, Antwerp");
    expect(rows["Stop 1"]).toBe(
      "Depot Zeebrugge · 2026-10-04 · Disconnect chassis · picked back 2026-10-06 10:00",
    );
    expect(rows["Picked back on"]).toBe("2026-10-05 16:00");
    // without the modes table a mode is read as direct loading
    expect(Object.fromEntries(loadingRows(booking, box, 2))["Loading date"]).toBe(
      "2026-10-03 07:30",
    );
    expect(copyGaps(booking, box, 2)).toEqual([]);
    // the driver is told what is inside by name, never the weights or the seal
    const trucker = Object.fromEntries(
      truckerBoxRows(booking, {
        ...box,
        cargoKg: 12000,
        seals: ["ML123"],
        hsLines: [
          {
            code: "630900",
            description: "Worn clothing",
            weightKg: 12000,
            packages: 620,
            packageType: "Bales",
          },
        ],
      }),
    );
    expect(trucker).toEqual({ Type: "40HC", Commodity: "Worn clothing" });
    expect(
      Object.fromEntries(truckerBoxRows({ ...booking, commodity: "Used clothing" }, box))[
        "Commodity"
      ],
    ).toBe("Used clothing");
    // the second box inherits nothing from the first, not even the booking's date
    expect(copyGaps(booking, bare(null), 2)).toEqual([
      "loading address",
      "loading date",
      "loading mode",
      "container number",
    ]);
  });
  it("name the goods once and let the lines' totals be the box's weight and packages", () => {
    const rows = Object.fromEntries(
      boxRows(booking, {
        ...bare("MSKU1234567"),
        cargoKg: 1,
        hsLines: [
          {
            code: "630900",
            description: "Worn clothing",
            weightKg: 12000,
            packages: 620,
            packageType: "Bales",
          },
          {
            code: "640399",
            description: null,
            weightKg: 3000,
            packages: 40,
            packageType: "Cartons",
          },
        ],
        blDescription: "620 BALES OF WORN CLOTHING",
      }),
    );
    expect(rows["Commodity"]).toBe("Worn clothing\n640399");
    expect(rows["HS 630900"]).toBeUndefined();
    expect(rows["Packages"]).toBe("660 Bales + Cartons");
    expect(rows["Cargo weight"]).toBe("15,000 kg");
    expect(rows["B/L description"]).toBe("620 BALES OF WORN CLOTHING");
  });
  it("tell the customer when each box is loaded — delivered and picked back under a drop mode", () => {
    const dropped: CopyBox = {
      ...bare("MSKU1234567"),
      loadAddress: "ACME\nQuay 730\n2000 Antwerp, BE\n+32 3 000 00 00",
      loadDate: "2026-10-03",
      loadTime: "07:30",
      loadingMode: "Drop off container on ground",
      pickBackDate: "2026-10-05",
      pickBackTime: "16:00",
    };
    const direct: CopyBox = {
      ...bare(null),
      loadAddress: "ACME\nQuay 730\n2000 Antwerp, BE\n+32 3 000 00 00",
      loadDate: "2026-10-04",
      loadTime: "09:00",
      loadingMode: "Direct loading — 2 hours",
      stops: [{ address: "Depot Zeebrugge", date: "2026-10-04", time: "12:00" }],
    };
    // one dropped box: delivered on, and picked back on
    const one = Object.fromEntries(customerLoadingRows(booking, [dropped], DEFAULT_LOADING_MODES));
    expect(one["Loading address"]).toBe("ACME\nQuay 730\n2000 Antwerp, BE\n+32 3 000 00 00");
    expect(one["Delivered on"]).toBe("2026-10-03 07:30");
    expect(one["Loading mode"]).toBe(
      "Drop off container on ground · picked back on 2026-10-05 16:00",
    );
    // the booking's own date never stands in for a box when there are several
    const two = Object.fromEntries(
      customerLoadingRows(booking, [dropped, direct], DEFAULT_LOADING_MODES),
    );
    expect(two["Loading / delivery date"]).toBe(
      "MSKU1234567 — 2026-10-03 07:30\nContainer 2 — 2026-10-04 09:00",
    );
    expect(two["Loading address"]).toBe("ACME\nQuay 730\n2000 Antwerp, BE\n+32 3 000 00 00");
    expect(two["Container 2 — Stop 1"]).toBe("Depot Zeebrugge · 2026-10-04 12:00");
    // no box says anything yet: the booking's proposal stands for its one box
    expect(Object.fromEntries(customerLoadingRows(booking, [bare(null)], []))["Loading date"]).toBe(
      "2026-10-02",
    );
    expect(Object.fromEntries(customerLoadingRows(booking, [], []))["Loading date"]).toBe("—");
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
    {
      description: "Ocean freight",
      qty: 2,
      sellCents: 425_000,
      vatCode: "EX41",
      listed: true,
      perBox: true,
      condition: false,
    },
    {
      description: "THC",
      qty: 1,
      sellCents: 21_000,
      vatCode: "EX41",
      listed: false,
      perBox: true,
      condition: false,
    },
  ];
  it("totals the lines and carries the exemption mention", () => {
    const t = priceTable({
      display: "itemized",
      validUntil: null,
      paymentTerm: null,
      boxes: 1,
      lines,
    });
    expect(t.net).toBe(871_000);
    expect(t.vat).toBe(0);
    expect(t.mentions[0]).toMatch(/article 41/);
    expect(t.lines[0].amountCents).toBe(850_000);
  });
  it("names only the listed services when all-inclusive", () => {
    const t = priceTable({
      display: "inclusive",
      validUntil: null,
      paymentTerm: null,
      boxes: 1,
      lines,
    });
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

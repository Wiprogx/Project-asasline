import { describe, expect, it } from "vitest";
import { type ImportedItem, mapLegacyQuotation, statusOf } from "./legacy-quotations";

const ITEMS: Record<string, ImportedItem> = {
  "1": {
    id: "rate-1",
    category: "ocean",
    label: "BEANR › CMDLA · 40HC · MSC",
    vatCode: "EX41",
    pol: "BEANR",
    pod: "CMDLA",
    containerType: "40HC",
  },
  "100": {
    id: "rate-100",
    category: "freetime",
    label: "Demurrage — destination · 14 free days",
    vatCode: "EX41",
    pol: null,
    pod: null,
    containerType: null,
  },
};
const items = (id: string) => ITEMS[id];

describe("mapLegacyQuotation", () => {
  it("keeps the QT reference and reads the header the new way", () => {
    const r = mapLegacyQuotation(
      {
        ref: "QT2609004",
        status: "won",
        kind: "Both",
        validUntil: "2026-10-31",
        termId: "d30",
        display: "inclusive",
        sentAt: "2026-09-20T10:31",
        sentVia: "email",
        commodity: "630900",
        routes: [],
      },
      items,
    );
    expect(r?.quotation).toMatchObject({
      ref: "QT2609004",
      status: "accepted",
      kind: "both",
      validUntil: "2026-10-31",
      paymentTermId: "d30",
      display: "inclusive",
      sentOn: "2026-09-20",
      commodity: "630900",
    });
  });

  it("builds each destination from its ocean leg, and its lines from the catalogue", () => {
    const r = mapLegacyQuotation(
      {
        ref: "QT1",
        routes: [
          {
            laneId: 1,
            qty: 2,
            declined: true,
            declineReason: "Too dear",
            lines: [
              { itemId: 1, sell: 4250, cost: 2650, src: "agreement" },
              { itemId: 100, sell: 0, cost: 0, box: 1, src: "auto" },
              { itemId: 999, sell: 10, cost: 5, src: "man" },
            ],
          },
        ],
      },
      items,
    );
    expect(r?.routes[0].route).toMatchObject({
      pol: "BEANR",
      pod: "CMDLA",
      containerType: "40HC",
      declined: true,
      declinedReason: "Too dear",
      boxes: 2,
    });
    expect(r?.routes[0].lines).toMatchObject([
      {
        itemId: "rate-1",
        sellCents: 425000,
        costCents: 265000,
        perBox: true,
        priceSource: "agreement",
      },
      { itemId: "rate-100", condition: true, perBox: false, priceSource: "catalogue" },
      { itemId: null, description: "Item 999", priceSource: "manual" },
    ]);
    expect(r?.warnings).toEqual(["a line names catalogue item 999, not found — kept as typed"]);
  });

  it("carries a lost or cancelled quotation's reason", () => {
    expect(
      mapLegacyQuotation({ ref: "Q", status: "lost", lostReason: "Cheaper" }, items)?.quotation,
    ).toMatchObject({ status: "declined", declinedReason: "Cheaper" });
    expect(
      mapLegacyQuotation(
        {
          ref: "Q",
          status: "cancelled",
          statusBefore: "sent",
          cancel: { reason: "Goods not ready", note: "June" },
        },
        items,
      )?.quotation,
    ).toMatchObject({
      status: "cancelled",
      cancelReason: "Goods not ready — June",
      statusBeforeCancel: "sent",
    });
  });

  it("reads an older quotation with its one destination on itself, and needs a reference", () => {
    const r = mapLegacyQuotation({ ref: "QT2", laneId: 1, lines: [{ itemId: 1, sell: 1 }] }, items);
    expect(r?.routes).toHaveLength(1);
    expect(r?.routes[0].lines).toHaveLength(1);
    expect(mapLegacyQuotation({}, items)).toBeNull();
    expect(statusOf("weird")).toBe("draft");
  });
});

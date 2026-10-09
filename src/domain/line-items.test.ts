import { describe, expect, it } from "vitest";
import {
  DEFAULT_LINE_ITEMS,
  itemsFor,
  lineItemLines,
  lineOptions,
  parseLineItemLines,
} from "./line-items";

describe("the line items", () => {
  it("port the legacy GL_ITEMS and SALE_ITEMS", () => {
    expect(itemsFor(DEFAULT_LINE_ITEMS, "purchase")).toHaveLength(8);
    expect(itemsFor(DEFAULT_LINE_ITEMS, "sale")).toHaveLength(2);
    expect(DEFAULT_LINE_ITEMS.find((i) => i.id === "equip")?.account).toBe("230000");
  });

  it("round-trip their lines and refuse a bad kind, account or VAT code", () => {
    const { items, problems } = parseLineItemLines(lineItemLines(DEFAULT_LINE_ITEMS));
    expect(problems).toEqual([]);
    expect(items).toEqual(DEFAULT_LINE_ITEMS);
    expect(parseLineItemLines("Rent | purchase | Rent | 610000").problems[0]).toMatch(/lowercase/);
    expect(parseLineItemLines("rent | cost | Rent | 610000").problems[0]).toMatch(
      /sale or purchase/,
    );
    expect(parseLineItemLines("rent | purchase | Rent | 61000").problems[0]).toMatch(/six-digit/);
    expect(parseLineItemLines("rent | purchase | Rent | 610000 | S99").problems[0]).toMatch(/VAT/);
    expect(
      parseLineItemLines("rent | purchase | Rent | 610000\nrent | sale | X | 700000").problems[0],
    ).toMatch(/twice/);
    expect(parseLineItemLines("x | sale | Something | 740000").items[0].vat).toBe("S21");
  });

  it("offer the catalogue at the right price and account, then the general items", () => {
    const rates = [
      {
        id: "a",
        label: "Ocean BEANR → TRMER 40HC",
        sellCents: 125_000,
        buyCents: 90_000,
        vatCode: "EX41",
      },
    ];
    const sale = lineOptions("sale", rates, DEFAULT_LINE_ITEMS);
    expect(sale[0]).toEqual({
      key: "r:a",
      label: "Ocean BEANR → TRMER 40HC · catalogue",
      description: "Ocean BEANR → TRMER 40HC",
      unitCents: 125_000,
      vatCode: "EX41",
      account: "700000",
    });
    expect(sale.map((o) => o.key)).toEqual(["r:a", "g:s_equip", "g:s_other"]);
    const purchase = lineOptions("purchase", rates, DEFAULT_LINE_ITEMS);
    expect(purchase[0]).toMatchObject({ unitCents: 90_000, account: "604000" });
    expect(purchase).toHaveLength(9);
    expect(purchase.find((o) => o.key === "g:rent")).toMatchObject({
      label: "Office rent · general",
      unitCents: 0,
      vatCode: "S21",
      account: "610000",
    });
  });
});

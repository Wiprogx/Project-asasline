import { describe, expect, it, vi } from "vitest";
import { ublXml } from "@/domain/peppol";
import { invoice } from "../../test/factories/peppol";
import { parseUbl } from "./ubl";

vi.mock("server-only", () => ({}));

describe("parseUbl", () => {
  it("reads back what ublXml writes", () => {
    const u = parseUbl(ublXml(invoice))!;
    expect(u).toMatchObject({
      credit: false,
      number: "INV/2026/00042",
      issueDate: "2026-09-01",
      dueDate: "2026-10-01",
      currency: "EUR",
      supplier: { name: "ASASLINE S.A.", vat: "BE0772649540", country: "BE" },
      iban: "BE41068941625810",
      paymentId: "+++090/9337/55493+++",
      totalCents: 162_100,
    });
    expect(u.lines).toEqual([
      { description: "Ocean freight", qty: 1, unitCents: 150_000, vatCode: "RC" },
      { description: "Handling", qty: 2, unitCents: 5_000, vatCode: "S21" },
    ]);
  });

  it("reads a credit note", () => {
    expect(parseUbl(ublXml({ ...invoice, credit: true }))?.credit).toBe(true);
  });

  it("refuses anything that is not a UBL invoice or credit note", () => {
    expect(parseUbl("<Order><ID>1</ID></Order>")).toBeNull();
    expect(parseUbl("not xml at all <<<")).toBeNull();
  });
});

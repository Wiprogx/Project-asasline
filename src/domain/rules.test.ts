import { describe, expect, it } from "vitest";
import { defaultSaleVat } from "./accounting";
import { COMPANY } from "./company";
import { ibanOk } from "./iban";
import { lettermark } from "./contacts";
import { can, PERMISSIONS, ROLES } from "./permissions";

describe("permissions", () => {
  it("matches the legacy matrix", () => {
    expect(can("admin", "app.settings")).toBe(true);
    expect(can("docs_clerk", "app.accounting")).toBe(false);
    expect(can("accountant", "bookings.edit")).toBe(false);
    expect(can("team_lead", "audit.view")).toBe(true);
    expect(can("team_lead", "accounting.bank")).toBe(false);
  });
  it("fails closed", () => {
    expect(can(null, "app.contacts")).toBe(false);
    expect(can("ghost" as never, "app.contacts")).toBe(false);
  });
  it("keeps Admin able to do everything", () => {
    for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(can(ROLES[0], p)).toBe(true);
    }
  });
});

describe("default sale VAT", () => {
  it("is exempt at home, reverse charge in the EU, outside scope beyond", () => {
    expect(defaultSaleVat("BE")).toBe("EX41");
    expect(defaultSaleVat("nl")).toBe("RC");
    expect(defaultSaleVat("TR")).toBe("OUT");
    expect(defaultSaleVat(null)).toBe("EX41");
  });
});

describe("lettermark", () => {
  it("takes initials of the first two words", () => {
    expect(lettermark("Os Textile SPRL")).toBe("OT");
    expect(lettermark("maersk")).toBe("MA");
    expect(lettermark("  ")).toBe("?");
  });
});

describe("letterhead", () => {
  it("prints an IBAN that passes its own check, and a Belgian VAT number", () => {
    expect(ibanOk(COMPANY.iban)).toBe(true);
    expect(COMPANY.vat).toMatch(/^BE0\d{9}$/);
  });
});

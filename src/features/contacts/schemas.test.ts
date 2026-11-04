import { describe, expect, it } from "vitest";
import { ID_FORMATS } from "@/domain/contacts";
import { checkedContactSchema, sendContactFileSchema } from "./schemas";

const address = { street: "Kaai 1", city: "Antwerpen", country: "BE" };
const company = { ...address, type: "company", name: "Acme", vat: "x", eori: "x" };
const errorsOf = (raw: Record<string, string>, formats = [] as typeof ID_FORMATS) => {
  const r = checkedContactSchema(formats).safeParse(raw);
  return r.success ? {} : r.error.flatten().fieldErrors;
};

describe("a contact's VAT and EORI numbers on save", () => {
  const full = { ...company, professions: "Transporter" };

  it("leaves an EU number's shape to its register, keeping only the Belgian check digits", () => {
    expect(
      errorsOf({ ...full, vat: "BE1234567894", eori: "BE1234567894" }, ID_FORMATS).vat,
    ).toBeUndefined();
    expect(errorsOf({ ...full, vat: "BE1234567895" }, ID_FORMATS).vat).toEqual([
      "This VAT number fails the Belgian check digits — a digit is wrong",
    ]);
    const nl = { ...full, country: "NL", vat: "NL8612", eori: "NL8612" };
    expect(errorsOf(nl, ID_FORMATS).vat).toBeUndefined();
  });

  it("holds a number of a country without a register to its format", () => {
    const tr = { ...full, country: "TR", vat: "12345", eori: "TR1" };
    expect(errorsOf(tr, ID_FORMATS).vat).toEqual([
      "A TR VAT number is 10 digits — for example 1234567890",
    ]);
  });
});

describe("a contact's profession", () => {
  it("is required of a company", () => {
    expect(errorsOf(company).professions).toEqual(["A company needs at least one profession"]);
    expect(errorsOf({ ...company, professions: "Transporter" }).professions).toBeUndefined();
  });

  it("is not asked of a person or a location", () => {
    const person = { ...address, type: "person", lastName: "Peeters", email: "p@e2e.test" };
    expect(errorsOf(person).professions).toBeUndefined();
    expect(errorsOf({ ...address, type: "location", name: "Depot" }).professions).toBeUndefined();
  });
});

describe("a contact's credit limit", () => {
  const withLimit = (creditLimit: string) => errorsOf({ ...company, creditLimit }).creditLimit;

  it("takes an amount in euros", () => {
    expect(withLimit("5000.00")).toBeUndefined();
    expect(withLimit("21474836.47")).toBeUndefined();
  });

  it("refuses a negative amount and one the column cannot hold", () => {
    expect(withLimit("-500")).toEqual(["From 0 up to 21474836.47"]);
    expect(withLimit("99999999999")).toEqual(["From 0 up to 21474836.47"]);
  });
});

describe("a contact file sent by e-mail", () => {
  const sent = { contactId: crypto.randomUUID(), fileId: crypto.randomUUID(), where: "contact" };
  const ccOf = (cc: string) =>
    sendContactFileSchema.parse({ ...sent, to: "a@x.be", subject: "Papers", cc }).cc;

  it("splits its copies on commas, semicolons and spaces, never inside an address", () => {
    expect(ccOf("nicolas@asasline.com; sales@x.be ops@x.be")).toEqual([
      "nicolas@asasline.com",
      "sales@x.be",
      "ops@x.be",
    ]);
  });
});

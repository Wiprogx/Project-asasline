import { describe, expect, it } from "vitest";
import { checkedContactSchema, sendContactFileSchema } from "./schemas";

const address = { street: "Kaai 1", city: "Antwerpen", country: "BE" };
const company = { ...address, type: "company", name: "Acme", vat: "x", eori: "x" };
const errorsOf = (raw: Record<string, string>) => {
  const r = checkedContactSchema([]).safeParse(raw);
  return r.success ? {} : r.error.flatten().fieldErrors;
};

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

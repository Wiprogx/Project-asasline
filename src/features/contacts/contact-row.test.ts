import { describe, expect, it } from "vitest";
import { postedRow } from "./contact-row";
import { checkedContactSchema } from "./schemas";

const address = { street: "Kaai 1", city: "Antwerpen", country: "BE" };
const parse = (raw: Record<string, string>) => checkedContactSchema([]).parse(raw);
const posting = (raw: Record<string, string>) => (k: string) => k in raw;

describe("the columns an edit writes", () => {
  it("leaves alone what the type's form does not show", () => {
    const raw = { ...address, type: "location", name: "Depot", lang: "nl" };
    const row = postedRow(parse(raw), posting(raw));
    for (const hidden of ["vat", "eori", "creditLimitCents", "paymentTermId", "usesLastPrice"])
      expect(row).not.toHaveProperty(hidden);
    expect(row).toMatchObject({ name: "Depot", type: "location", lang: "nl" });
  });

  it("clears a field the form showed and the person emptied", () => {
    const raw = { ...address, type: "person", lastName: "Peeters", email: "p@x.be", lang: "nl" };
    const row = postedRow(parse(raw), (k) => k in raw || k === "vat" || k === "creditLimit");
    expect(row).toMatchObject({ vat: null, creditLimitCents: null, name: "Peeters" });
    expect(row).not.toHaveProperty("eori");
  });
});

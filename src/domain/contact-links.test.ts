import { describe, expect, it } from "vitest";
import { childToContact, splitName } from "./contact-links";

const parent = { name: "Acme NV", lang: "fr", country: "BE" };
const child = {
  type: "Delivery address",
  name: "Warehouse Zeebrugge",
  street: "Kaai 12",
  zip: "8380",
  cityId: "c-zeebrugge",
  country: null,
  phone: null,
  email: null,
  note: "Gate 3",
};

describe("childToContact", () => {
  it("makes a location of a place, keeping its kind as the link's role", () => {
    const c = childToContact(child, parent);
    expect(c).toMatchObject({
      type: "location",
      name: "Warehouse Zeebrugge",
      lastName: null,
      role: "Delivery address",
      country: "BE",
      lang: "fr",
      note: "Gate 3",
    });
  });

  it("makes a person of a contact, splitting the name", () => {
    const c = childToContact({ ...child, type: "Contact", name: "Jan de Vries" }, parent);
    expect(c).toMatchObject({ type: "person", firstName: "Jan de", lastName: "Vries" });
  });

  it("names an unnamed child after its kind and parent", () => {
    expect(childToContact({ ...child, name: null }, parent).name).toBe(
      "Delivery address — Acme NV",
    );
    const p = childToContact({ ...child, type: "doc check", name: " " }, parent);
    expect(p).toMatchObject({ type: "person", name: "doc check — Acme NV" });
    expect(p.lastName).toBe("doc check — Acme NV");
  });
});

describe("splitName", () => {
  it("reads one word as a last name", () => {
    expect(splitName("Peeters")).toEqual({ firstName: null, lastName: "Peeters" });
  });
});

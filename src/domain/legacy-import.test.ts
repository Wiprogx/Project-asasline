import { describe, expect, it } from "vitest";
import { mapLegacyContact, mapLegacyUser } from "./legacy-contacts";
import { countByKind, readLegacyExport } from "./legacy-export";

const ana = {
  id: 7,
  name: "A N A ((ANA)) BVBA",
  type: "Company",
  kind: "customer",
  professions: ["Textiles", "Used clothing"],
  addr: "Antwerpsesteenweg 43",
  city: "Rumst",
  zip: "2840",
  country: "be",
  lang: "NL",
  tva: "BE0464.648.410",
  tvaChecked: "2026-02-30",
  eoriChecked: "2026-03-01",
  mobile: "+32 477 92 29 06",
  web: "",
  tags: ["B2B", ""],
  creditLimit: 2500,
  pricing: "last",
  termId: "d30",
  docs: [{ n: "SLA.pdf" }],
  banks: [
    { iban: "be68 5390 0754 7034", bic: "gkccbebb", note: "main" },
    { iban: "BE00 0000 0000 0000" },
  ],
  children: [{ t: "Consignee", n: "SOPDJANG", country: "CM", tel: "00237 695956567" }, {}],
};

describe("readLegacyExport", () => {
  it("reads phpMyAdmin's JSON export: records with their bodies parsed, users as they came", () => {
    const file = JSON.stringify([
      { type: "header", version: "5.2" },
      {
        type: "table",
        name: "records",
        data: [
          { kind: "contacts", id: "7", body: JSON.stringify(ana), version: "3", archived: "0" },
          { kind: "contacts", id: "8", body: '{"name":"Old"}', archived: "1" },
          { kind: "bookings", id: "9", body: "{oops" },
          { kind: "", id: "10", body: "{}" },
        ],
      },
      { type: "table", name: "users", data: [{ email: "a@b.be" }] },
    ]);
    const r = readLegacyExport(file);
    if ("error" in r) throw new Error(r.error);
    expect(r.records.map((x) => [x.kind, x.id, x.archived])).toEqual([
      ["contacts", "7", false],
      ["contacts", "8", true],
    ]);
    expect(r.records[0].body.name).toBe(ana.name);
    expect(r.unreadable).toEqual(["bookings 9: body is not JSON", "record 4: no kind or id"]);
    expect(r.users).toEqual([{ email: "a@b.be" }]);
    expect(countByKind(r.records)).toEqual({ contacts: 2 });
  });

  it("takes a plain { records, users } object and refuses what is not an export", () => {
    const r = readLegacyExport(JSON.stringify({ records: [{ kind: "x", id: 1, body: {} }] }));
    expect("error" in r ? r.error : r.records[0].id).toBe("1");
    expect(readLegacyExport("not json")).toHaveProperty("error");
    expect(readLegacyExport('{"a":1}')).toEqual({
      error: "No `records` or `users` table in the file.",
    });
  });
});

describe("mapLegacyContact", () => {
  it("carries every field, cleans the numbers, money in cents, a bad date or IBAN left out", () => {
    const r = mapLegacyContact(ana);
    expect(r?.contact).toMatchObject({
      name: "A N A ((ANA)) BVBA",
      type: "company",
      kind: "customer",
      country: "BE",
      lang: "nl",
      vat: "BE0464648410",
      vatCheckedOn: null,
      eoriCheckedOn: "2026-03-01",
      website: null,
      street: "Antwerpsesteenweg 43",
      tags: ["B2B"],
      creditLimitCents: 250000,
      usesLastPrice: true,
      paymentTermId: "d30",
    });
    expect(r?.banks).toEqual([{ iban: "BE68539007547034", bic: "GKCCBEBB", label: "main" }]);
    expect(r?.addresses).toHaveLength(2);
    expect(r?.addresses[0]).toMatchObject({ type: "Consignee", name: "SOPDJANG", country: "CM" });
    expect(r?.addresses[1].type).toBe("Other address");
    expect(r?.warnings).toEqual([
      "1 document(s) on the contact are files — not carried",
      "IBAN BE00000000000000 fails its check — left out",
    ]);
  });

  it("needs a name; an unknown language becomes English with a warning", () => {
    expect(mapLegacyContact({ name: " " })).toBeNull();
    const r = mapLegacyContact({ name: "X", type: "Person", kind: "nope", lang: "de" });
    expect(r?.contact).toMatchObject({ type: "person", kind: "customer", lang: "en" });
    expect(r?.warnings).toEqual(['language "de" is not offered — set to English']);
  });
});

describe("mapLegacyUser", () => {
  const hash = "$2y$10$abcdefghijklmnopqrstuuJ7nC0nZ2V0zPj0q8sZ8G6sVb3n1yq5a";
  it("keeps the PHP hash and reads the legacy role names", () => {
    expect(
      mapLegacyUser({
        email: "Nadia@Asasline.be",
        name: "Nadia",
        role: "Docs clerk",
        password_hash: hash,
        active: "0",
      }),
    ).toEqual({
      email: "nadia@asasline.be",
      name: "Nadia",
      role: "docs_clerk",
      passwordHash: hash,
      active: false,
    });
  });

  it("refuses a row without an e-mail, a known role or a bcrypt hash", () => {
    expect(mapLegacyUser({ name: "X" })).toEqual({ error: "no e-mail (X)" });
    expect(mapLegacyUser({ email: "a@b.be", role: "Boss", hash })).toHaveProperty("error");
    expect(mapLegacyUser({ email: "a@b.be", role: "Admin", password: "plain" })).toEqual({
      error: "a@b.be: no bcrypt hash",
    });
  });
});

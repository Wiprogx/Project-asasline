import { describe, expect, it } from "vitest";
import { changesOf, describeChanges } from "./changes";

describe("changesOf", () => {
  it("keeps only the fields whose value changed, from and to", () => {
    expect(
      changesOf(
        { name: "Acme", city: "Gent", tags: [] },
        { name: "Acme", city: "Brussel", tags: ["B2B"] },
      ),
    ).toEqual({ city: ["Gent", "Brussel"], tags: ["—", "B2B"] });
  });

  it("reads empty, null and missing alike", () => {
    expect(changesOf({ note: null }, { note: "" })).toEqual({});
    expect(changesOf({}, { note: undefined })).toEqual({});
  });

  it("looks only at the fields asked for", () => {
    expect(changesOf({ a: 1, b: 1 }, { a: 2, b: 2 }, ["a"])).toEqual({ a: ["1", "2"] });
  });
});

describe("describeChanges", () => {
  it("says each change in the screen's words", () => {
    expect(
      describeChanges({ city: ["Gent", "Brussel"], vat: ["—", "BE0123"] }, { city: "City" }),
    ).toBe("City: Gent → Brussel · vat: — → BE0123");
  });
});

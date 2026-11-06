import { describe, expect, it } from "vitest";
import { columnValues, createLookupSchema, updateLookupSchema } from "./schemas";

describe("a Settings list's form", () => {
  it("reads the words alone for a list of words", () => {
    const parsed = createLookupSchema("cancel-reasons").safeParse({
      kind: "cancel-reasons",
      label: "Goods not ready",
      position: "10",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toMatchObject({ label: "Goods not ready", position: 10 });
    expect(columnValues("cancel-reasons", parsed.success ? parsed.data : {})).toEqual({});
  });

  it("spells a box owner's prefix in capitals and refuses one that is not four letters", () => {
    const ok = createLookupSchema("box-owners").safeParse({
      kind: "box-owners",
      label: "mscu",
      owner: "MSC",
    });
    expect(ok.success && ok.data.label).toBe("MSCU");
    expect(ok.success && columnValues("box-owners", ok.data)).toEqual({
      owner: "MSC",
      carrierId: null,
    });
    const short = createLookupSchema("box-owners").safeParse({
      kind: "box-owners",
      label: "MS",
      owner: "MSC",
    });
    expect(short.success).toBe(false);
    const nameless = createLookupSchema("box-owners").safeParse({
      kind: "box-owners",
      label: "MSCU",
    });
    expect(nameless.success).toBe(false);
  });

  it("reads a container type's tare and maximum gross as whole kilograms, empty as none", () => {
    const given = updateLookupSchema("container-types").safeParse({
      kind: "container-types",
      id: "0a2a3a4a-5a6a-4a7a-8a9a-0a1a2a3a4a5a",
      version: "3",
      label: "45hc",
      tareKg: "4800",
      maxGrossKg: "32500",
    });
    expect(given.success && columnValues("container-types", given.data)).toEqual({
      tareKg: 4800,
      maxGrossKg: 32500,
    });
    expect(given.success && given.data.label).toBe("45HC");
    const none = createLookupSchema("container-types").safeParse({
      kind: "container-types",
      label: "40PW",
    });
    expect(none.success && columnValues("container-types", none.data)).toEqual({
      tareKg: null,
      maxGrossKg: null,
    });
    const half = createLookupSchema("container-types").safeParse({
      kind: "container-types",
      label: "40HC",
      tareKg: "39.5",
    });
    expect(half.success).toBe(false);
  });

  it("reads a document type's checkbox as a yes/no", () => {
    const on = createLookupSchema("doc-types").safeParse({
      kind: "doc-types",
      label: "HOUSE BL",
      onPaper: "on",
    });
    expect(on.success && columnValues("doc-types", on.data)).toEqual({ onPaper: true });
    const off = createLookupSchema("doc-types").safeParse({ kind: "doc-types", label: "HOUSE BL" });
    expect(off.success && columnValues("doc-types", off.data)).toEqual({ onPaper: false });
  });
});

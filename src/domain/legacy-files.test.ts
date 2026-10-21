import { describe, expect, it } from "vitest";
import { mapLegacyFile, parseDataUrl } from "./legacy-files";

describe("parseDataUrl", () => {
  it("splits a base64 data URL into its type and body", () => {
    expect(parseDataUrl("data:application/pdf;base64,JVBERi0=")).toEqual({
      mime: "application/pdf",
      base64: "JVBERi0=",
    });
    expect(parseDataUrl("data:text/plain,hello")).toBeNull();
    expect(parseDataUrl(null)).toBeNull();
  });
});

describe("mapLegacyFile", () => {
  it("keeps the name, the type by extension, the content and every booking it was filed on", () => {
    const r = mapLegacyFile({
      name: "BL draft.pdf",
      data: "data:application/octet-stream;base64,JVBERi0=",
      links: [
        { ref: "SB2609014", code: "BL_DRAFT", box: "", stage: "draft" },
        { ref: "SB2609015", code: "CERTIWEIGHT", box: "MSKU1234565" },
        { code: "X" },
      ],
    });
    expect(r).toEqual({
      name: "BL draft.pdf",
      ext: ".pdf",
      mime: "application/pdf",
      base64: "JVBERi0=",
      links: [
        { ref: "SB2609014", code: "BL_DRAFT", box: null, draft: true },
        { ref: "SB2609015", code: "CERTIWEIGHT", box: "MSKU1234565", draft: false },
      ],
    });
  });

  it("says why a file cannot come: no content, or on no booking", () => {
    expect(mapLegacyFile({ name: "a.pdf" })).toEqual({
      skip: "a.pdf: its content is not in the export",
    });
    expect(mapLegacyFile({ name: "a.pdf", data: "data:x;base64,AA==", links: [] })).toEqual({
      skip: "a.pdf: filed on no booking",
    });
  });
});

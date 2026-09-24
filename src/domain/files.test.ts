import { describe, expect, it } from "vitest";
import { DEFAULT_FILE_HINTS, fileCodeOf, fileProblem, missingCount, requirementsOf } from "./files";

describe("fileCodeOf", () => {
  it("files by the words in the name, whatever the case", () => {
    expect(fileCodeOf("Facture-2026-118.pdf", DEFAULT_FILE_HINTS)).toBe("INVOICE");
    expect(fileCodeOf("SB2609001 EX-A.pdf", DEFAULT_FILE_HINTS)).toBe("EXA");
    expect(fileCodeOf("certiweight_MSKU1234567.pdf", DEFAULT_FILE_HINTS)).toBe("CERTIWEIGHT");
  });
  it("gives nothing for a name no hint knows", () => {
    expect(fileCodeOf("photo.jpg", DEFAULT_FILE_HINTS)).toBeNull();
  });
  it("treats hint words as words, not patterns", () => {
    expect(fileCodeOf("anything", [{ words: ".*", code: "ALL" }])).toBeNull();
  });
});

describe("fileProblem", () => {
  it("refuses a kind of file the office does not keep, an empty one, and a huge one", () => {
    expect(fileProblem({ name: "setup.exe", size: 10 })).toMatch(/not a file/);
    expect(fileProblem({ name: "a.pdf", size: 0 })).toMatch(/empty/);
    expect(fileProblem({ name: "a.pdf", size: 26 * 1024 * 1024 })).toMatch(/25 MB/);
    expect(fileProblem({ name: "Scan.PDF", size: 10 })).toBeNull();
  });
});

describe("requirementsOf", () => {
  const input = {
    destinationDocs: [{ code: "BESC", label: "BESC — CM" }],
    steps: [
      { code: "EXA", doc: "Export declaration", status: "open" as const },
      { code: "BESC", doc: "BESC", status: "waiting" as const },
      { code: "SI", doc: "Shipping instruction", status: "done" as const },
    ],
  };
  it("reads a final file as the paper, a draft as a draft, nothing as missing", () => {
    const reqs = requirementsOf({
      ...input,
      files: [
        { code: "BESC", stage: "draft" },
        { code: "SI", stage: "final" },
      ],
    });
    expect(reqs.map((r) => [r.code, r.state])).toEqual([
      ["BESC", "draft"],
      ["EXA", "missing"],
      ["SI", "final"],
    ]);
  });
  it("names a destination paper once, even when a step produces it too", () => {
    expect(requirementsOf({ ...input, files: [] }).filter((r) => r.code === "BESC")).toHaveLength(
      1,
    );
  });
  it("counts as missing only what an open step still asks for", () => {
    const reqs = requirementsOf({
      destinationDocs: [],
      steps: input.steps,
      files: [],
    });
    expect(missingCount(reqs)).toBe(1); // EXA; BESC waits, SI is done
  });
});

describe("requirements per box", () => {
  it("reads a paper filed against the box's step, not a same-coded paper of another box", () => {
    const reqs = requirementsOf({
      destinationDocs: [],
      steps: [
        { code: "CERTIWEIGHT#b1", doc: "Certiweight — box 1", status: "open" },
        { code: "CERTIWEIGHT#b2", doc: "Certiweight — box 2", status: "open" },
      ],
      files: [{ code: "CERTIWEIGHT", ruleCode: "CERTIWEIGHT#b1", stage: "final" }],
    });
    expect(reqs.map((r) => r.state)).toEqual(["final", "missing"]);
  });
});

describe("requirements per box", () => {
  it("reads a paper filed against the box's step, not a same-coded paper of another box", () => {
    const reqs = requirementsOf({
      destinationDocs: [],
      steps: [
        { code: "CERTIWEIGHT#b1", doc: "Certiweight — box 1", status: "open" },
        { code: "CERTIWEIGHT#b2", doc: "Certiweight — box 2", status: "open" },
      ],
      files: [{ code: "CERTIWEIGHT", ruleCode: "CERTIWEIGHT#b1", stage: "final" }],
    });
    expect(reqs.map((r) => r.state)).toEqual(["final", "missing"]);
  });
});

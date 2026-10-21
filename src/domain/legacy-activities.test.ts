import { describe, expect, it } from "vitest";
import { type ActivityLookups, boxPosition, mapLegacyActivity } from "./legacy-activities";

const find: ActivityLookups = {
  user: (n) => (n === "Nadia Berten" ? "u-nadia" : null),
  record: (ref) =>
    ref === "SB2609014"
      ? { kind: "booking", id: "b-1" }
      : ref === "QT2609004"
        ? { kind: "quotation", id: "q-1" }
        : null,
  contact: (n) => (n === "ANA BVBA" ? "c-ana" : null),
  box: (b, label) => (b === "b-1" && label === "MSKU1234565" ? "box-1" : null),
};

describe("mapLegacyActivity", () => {
  it("finds the person, the record and the step's box", () => {
    const r = mapLegacyActivity(
      {
        title: "Send the Certiweight certificate — MSKU1234565",
        type: "Upload a document",
        who: "Nadia Berten",
        due: "2026-09-28",
        st: "open",
        link: "SB2609014",
        ruleCode: "CERTIWEIGHT",
        box: "MSKU1234565",
      },
      find,
    );
    expect(r?.task).toEqual({
      title: "Send the Certiweight certificate — MSKU1234565",
      type: "Upload a document",
      assigneeId: "u-nadia",
      due: "2026-09-28",
      ruleCode: "CERTIWEIGHT#box-1",
      state: "open",
      withdrawReason: null,
      note: null,
      linkKind: "booking",
      linkId: "b-1",
    });
    expect(r?.warnings).toEqual([]);
  });

  it("reads done and withdrawn, and links a task on a contact", () => {
    expect(
      mapLegacyActivity({ title: "x", st: "done", link: "QT2609004" }, find)?.task,
    ).toMatchObject({
      state: "done",
      linkKind: "quotation",
      linkId: "q-1",
    });
    expect(
      mapLegacyActivity(
        { title: "x", st: "open", withdrawn: { why: "Duplicate" }, contact: "ANA BVBA" },
        find,
      )?.task,
    ).toMatchObject({
      state: "withdrawn",
      withdrawReason: "Duplicate",
      linkKind: "contact",
      linkId: "c-ana",
    });
  });

  it("says what it could not find, and needs a title", () => {
    const r = mapLegacyActivity({ title: "x", who: "Somebody", link: "SB0000000" }, find);
    expect(r?.task).toMatchObject({ assigneeId: null, linkKind: null, linkId: null });
    expect(r?.warnings).toEqual([
      '"Somebody" is not a user here — the task has nobody',
      "its record SB0000000 was not found — kept unlinked",
    ]);
    expect(mapLegacyActivity({}, find)).toBeNull();
  });
});

describe("boxPosition", () => {
  it("reads a box named by its place", () => {
    expect(boxPosition("container 2")).toBe(1);
    expect(boxPosition("Box 1")).toBe(0);
    expect(boxPosition("MSKU1234565")).toBeNull();
  });
});

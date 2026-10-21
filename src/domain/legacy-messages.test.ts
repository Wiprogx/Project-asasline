import { describe, expect, it } from "vitest";
import { mapLegacyMessage } from "./legacy-messages";

describe("mapLegacyMessage", () => {
  it("reads an incoming mail on a booking, who took it, and its thread", () => {
    const r = mapLegacyMessage({
      at: "2026-09-21 10:32",
      dir: "in",
      ch: "email",
      to: "client@example.com",
      subject: "Re: [SB2609014/MSG] Loading",
      body: "Tuesday?",
      link: "SB2609014",
      threadId: "SB2609014/MSG",
      claimedBy: "Nadia Berten",
      claimedAt: "2026-09-21 10:40",
      files: [{ n: "a.pdf" }],
    });
    if ("skip" in r) throw new Error("skipped");
    expect(r.at).toBe("2026-09-21 10:32");
    expect(r.message).toMatchObject({
      channel: "email",
      direction: "in",
      fromText: "client@example.com",
      toText: null,
      linkRef: "SB2609014",
      threadId: "SB2609014/MSG",
    });
    expect(r.people).toEqual({
      author: null,
      claimedBy: "Nadia Berten",
      claimedAt: "2026-09-21 10:40",
    });
    expect(r.delivered).toBe(false);
    expect(r.warnings).toEqual(["1 attached file(s) not carried by this step"]);
  });

  it("reads a sent WhatsApp as delivered, its author named", () => {
    const r = mapLegacyMessage({
      at: "2026-09-21T11:00",
      dir: "out",
      ch: "whatsapp",
      to: "+32470",
      by: "Sam GROUN",
      replyTo: 5,
    });
    if ("skip" in r) throw new Error("skipped");
    expect(r.message).toMatchObject({ channel: "whatsapp", direction: "out", toText: "+32470" });
    expect(r.people.author).toBe("Sam GROUN");
    expect(r.delivered).toBe(true);
    expect(r.legacyReplyTo).toBe("5");
  });

  it("reads a call with its length and outcome, and an internal note in its room", () => {
    const call = mapLegacyMessage({
      at: "2026-09-21",
      dir: "in",
      ch: "call",
      secs: 125.4,
      outcome: "missed",
      answeredBy: "Luc",
    });
    if ("skip" in call) throw new Error("skipped");
    expect(call.message).toMatchObject({
      channel: "call",
      callSeconds: 125,
      callOutcome: "missed",
    });
    expect(call.people.claimedBy).toBe("Luc");
    const note = mapLegacyMessage({
      at: "2026-09-21 09:00",
      ch: "internal",
      chan: "docs",
      body: "hi",
      by: "Sam",
    });
    if ("skip" in note) throw new Error("skipped");
    expect(note.message).toMatchObject({
      channel: "internal",
      direction: "internal",
      room: "docs",
    });
  });

  it("needs a time; 'both' reads as e-mail", () => {
    expect(mapLegacyMessage({ body: "x" })).toEqual({ skip: "no time" });
    const r = mapLegacyMessage({ at: "2026-09-21", ch: "both", dir: "out" });
    if ("skip" in r) throw new Error("skipped");
    expect(r.message.channel).toBe("email");
  });
});

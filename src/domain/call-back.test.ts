import { describe, expect, it } from "vitest";
import { callBackTitle, callSecondsOf, needsCallBack } from "./call-back";

describe("call back", () => {
  it("makes a missed call or a voicemail work, never an answered one", () => {
    expect(needsCallBack("call", "missed")).toBe(true);
    expect(needsCallBack("call", "voicemail")).toBe(true);
    expect(needsCallBack("call", "answered")).toBe(false);
    expect(needsCallBack("email", "missed")).toBe(false);
  });

  it("names who to call and about what", () => {
    expect(callBackTitle("+32 470 11 22 33", "SB2610001")).toBe(
      "Call back +32 470 11 22 33 about SB2610001",
    );
    expect(callBackTitle("Os Textile", null)).toBe("Call back Os Textile");
  });

  it("keeps the minutes typed as seconds", () => {
    expect(callSecondsOf(2.5)).toBe(150);
    expect(callSecondsOf(undefined)).toBeUndefined();
  });
});

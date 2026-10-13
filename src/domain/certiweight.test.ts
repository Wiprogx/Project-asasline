import { describe, expect, it } from "vitest";
import { CERTI_META, certiState, isCertiweight } from "./certiweight";

describe("Certiweight on a booking", () => {
  it("is recognised by its name, whatever the case", () => {
    expect(isCertiweight("CertiWeight — port weighing")).toBe(true);
    expect(isCertiweight("VGM declaration")).toBe(false);
    expect(isCertiweight(null)).toBe(false);
  });

  it("is off until sold, and locked once a certificate is in", () => {
    expect(certiState(false, false)).toBe("off");
    expect(certiState(false, true)).toBe("off");
    expect(certiState(true, false)).toBe("sold");
    expect(certiState(true, true)).toBe("filed");
    expect(CERTI_META.filed.hint).toMatch(/stays/);
  });
});

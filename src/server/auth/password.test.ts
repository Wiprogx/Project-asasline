import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH } from "@/domain/users";
import { temporaryPassword } from "./password";

describe("temporaryPassword", () => {
  it("reads out as three groups of four, long enough to be a password", () => {
    const p = temporaryPassword();
    expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    expect(p.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
  });

  it("never uses the characters misheard on a call", () => {
    const all = Array.from({ length: 200 }, temporaryPassword).join("");
    expect(all).not.toMatch(/[0O1lI]/);
  });

  it("is a different one each time", () => {
    expect(new Set(Array.from({ length: 50 }, temporaryPassword)).size).toBe(50);
  });
});

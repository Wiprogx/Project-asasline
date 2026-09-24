// The browser suite's own `test`: a page that throws, or logs a hydration mismatch, fails the
// test that opened it. The runner passes such a page unless a test listens, so every spec imports
// `test` and `expect` from here rather than from @playwright/test.
import { test as base, expect } from "@playwright/test";

const HYDRATION = /hydrat|did not match|didn't match|server rendered HTML/i;

export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error" && HYDRATION.test(m.text())) errors.push(`hydration: ${m.text()}`);
      });
      await use(errors);
      expect(errors, "the page threw or failed to hydrate").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

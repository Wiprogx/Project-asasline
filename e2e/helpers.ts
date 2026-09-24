import { expect, type Locator, type Page } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@asasline.com",
  password: process.env.E2E_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "change-me-now-please",
};

/** A suffix that keeps records from different runs apart in a shared dev database. */
export const tag = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/**
 * Opens a page and waits until React has hydrated it (`<HydrationMark>`): a field typed into
 * before that is rewritten by hydration, and the test reads a value nobody typed.
 */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator("html[data-hydrated='1']").waitFor({ state: "attached" });
}

export async function login(page: Page, who = ADMIN) {
  await open(page, "/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

/** Sonner toasts: wait for the text, so a test reads the outcome the person reads. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

/**
 * Clicks a submit button and waits for that server action's own response. Waiting for a toast
 * alone is a race: the previous save's toast may still be on screen.
 */
export async function submit(page: Page, button: Locator) {
  const done = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined,
  );
  await button.click();
  await done;
}

/** A VAT number no other contact has: a Belgian one with valid check digits (97 − first eight mod 97). */
export function uniqueVat(country: "BE" | "DE"): string {
  const seven = String(Date.now()).slice(-7);
  if (country === "DE") return `DE${seven}${Math.floor(Math.random() * 90 + 10)}`;
  const base = `0${seven}`;
  return `BE${base}${String(97 - (Number(base) % 97)).padStart(2, "0")}`;
}

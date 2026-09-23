import { expect, type Locator, type Page } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@asasline.com",
  password: process.env.E2E_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "change-me-now-please",
};

/** A suffix that keeps records from different runs apart in a shared dev database. */
export const tag = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

export async function login(page: Page, who = ADMIN) {
  await page.goto("/login");
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

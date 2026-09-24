import { expect, test } from "./fixtures";
import { login, tag } from "./helpers";

test("an anonymous visitor is sent to the login page", async ({ page }) => {
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong password gets the one generic answer", async ({ page }) => {
  await page.goto("/login");
  // A fresh address each run: the login limiter (6 failures per email) would lock a fixed one.
  await page.getByLabel("Email").fill(`nobody.${tag()}@example.com`);
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "Email or password is not right.",
  );
});

test("the admin signs in and every migrated app opens", async ({ page }) => {
  await login(page);
  for (const [path, heading] of [
    ["/contacts", "Contacts"],
    ["/quotations", "Quotations"],
    ["/bookings", "Bookings"],
    ["/settings/people", "Settings"],
    ["/account", "My account"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

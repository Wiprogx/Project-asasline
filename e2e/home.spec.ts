import { expect, test } from "./fixtures";
import { login } from "./helpers";

test("home shows the launcher with its counts and the month's bookings", async ({ page }) => {
  await login(page);
  const main = page.getByRole("main");
  await expect(page.getByRole("heading", { level: 1, name: /^Good day/ })).toBeVisible();
  for (const app of [
    "Activity",
    "Quotations",
    "Bookings",
    "Contacts",
    "Discuss",
    "Accounting",
    "Settings",
  ])
    await expect(main.getByRole("link", { name: new RegExp(`^${app}`) })).toBeVisible();
  await expect(main.getByRole("link", { name: /^Quotations/ })).toContainText(
    /\d+ quotations · \d+ in follow-up/,
  );
  await expect(page.getByText(/^Bookings · [A-Z][a-z]+ \d{4}/)).toBeVisible();
  await expect(page.getByText("Overdue steps")).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: /^Bookings/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/bookings$/);
});

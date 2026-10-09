import { expect, test } from "./fixtures";
import { login, open, tag } from "./helpers";

test("the quotations list carries its figures, a value per quotation and status chips", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Figures Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  // Open, worth €900, no win rate yet.
  const row = () => page.getByRole("row").filter({ hasText: ref });
  const figures = page.locator('dl[aria-label="Figures"]');
  await open(page, `/quotations?q=${encodeURIComponent(client)}`);
  await expect(row()).toContainText("€900.00");
  await expect(figures).toContainText("Open 1");
  await expect(figures).toContainText("Win rate —");
  await page
    .getByRole("navigation", { name: "Status" })
    .getByRole("link", { name: "Accepted" })
    .click();
  await expect(page).toHaveURL(/status=accepted/);
  await expect(page.getByText("No quotations match.")).toBeVisible();

  // Accepted: booked, its value booked, a 100% win rate.
  await open(page, `/quotations?q=${encodeURIComponent(client)}`);
  await row().getByRole("link", { name: ref }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await open(page, `/quotations?q=${encodeURIComponent(client)}&status=accepted`);
  await expect(row()).toBeVisible();
  await expect(figures).toContainText("Booked 1");
  await expect(figures).toContainText("Booked value €900.00");
  await expect(figures).toContainText("Win rate 100%");
});

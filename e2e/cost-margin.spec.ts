import { expect, test } from "./fixtures";
import { login, open, tag } from "./helpers";

test("a booking's cost and margin read the quotation's buy side and the bills recorded", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  const client = `E2E Margin ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // One destination sold at 2,500 that costs 1,800.
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("CMDLA");
  await page.getByLabel("Service").fill(`Ocean freight to Douala ${t}`);
  await page.getByLabel("Sell (EUR)").fill("2500");
  await page.getByLabel("Cost (EUR)").fill("1800");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const qt = await page.getByRole("heading", { level: 1 }).innerText();
  await page.getByRole("button", { name: "Accept → create booking" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];

  // Expected from the quotation, nothing recorded yet, the profit against the expected cost.
  await open(page, `/bookings/${id}/cost`);
  await expect(page.getByRole("link", { name: qt })).toBeVisible();
  await expect(page.getByText(`Ocean freight to Douala ${t} · 1 × €1,800.00`)).toBeVisible();
  await expect(page.getByText("No purchase invoice recorded yet.")).toBeVisible();
  await expect(page.getByText("− €1,800.00 under")).toBeVisible();
  const profit = page.getByText("Profit", { exact: true }).last().locator("..");
  await expect(profit).toContainText("€700.00");
  await expect(page.getByText("28.0%")).toBeVisible();

  // Opening the figures leaves a trace in the audit log (legacy ACCESS_WATCH).
  await open(page, "/settings/audit?q=booking.cost.view");
  await expect(page.getByText("booking.cost.view").first()).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { expectToast, login, submit, tag } from "./helpers";

test("issuing past a customer's credit limit warns, and the contact shows it", async ({ page }) => {
  const t = tag();
  const client = `E2E Limit Client ${t}`;
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByLabel("Credit limit (EUR)").fill("1000");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  const contactUrl = page.url();
  await expect(page.getByText("Owed or to invoice: €0.00")).toBeVisible();

  await page.goto("/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("1250");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const billing = `${page.url()}/billing`;

  // Booked but not invoiced yet: it already counts.
  await page.goto(contactUrl);
  await expect(page.getByText("Owed or to invoice: €1,250.00")).toBeVisible();
  await expect(page.getByText("Over the credit limit")).toBeVisible();

  await page.goto(billing);
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expectToast(page, /Over the credit limit: €1,250\.00 owed or to invoice, limit €1,000\.00/);

  await page.goto("/accounting/reminders");
  await expect(page.getByRole("heading", { level: 1, name: "Reminders" })).toBeVisible();
});

import { expect, test } from "./fixtures";
import { login, open, tag } from "./helpers";

test("a contact's tabs list its bookings, quotations, invoices and messages", async ({ page }) => {
  const t = tag();
  await login(page);
  const client = `E2E Tabs ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  const contactId = page.url().split("/contacts/")[1];

  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill(`Ocean freight ${t}`);
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const qt = await page.getByRole("heading", { level: 1 }).innerText();
  await page.getByRole("button", { name: "Accept → create booking" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const sb = await page.getByRole("heading", { level: 1 }).innerText();

  await open(page, `/contacts/${contactId}/bookings`);
  const tabs = page.getByRole("navigation", { name: "Section" });
  await expect(page.getByRole("link", { name: sb })).toBeVisible();
  await tabs.getByRole("link", { name: "Quotations" }).click();
  await expect(page.getByRole("link", { name: qt })).toBeVisible();
  await tabs.getByRole("link", { name: "Invoices" }).click();
  await expect(page.getByText(/No invoice|no invoice/i).first()).toBeVisible();
  await tabs.getByRole("link", { name: "Messages" }).click();
  await expect(page.getByText("No message with this contact yet.")).toBeVisible();
  await tabs.getByRole("link", { name: "Details" }).click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
});

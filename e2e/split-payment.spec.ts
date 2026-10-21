import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

async function issued(page: Page, client: string, text: string, unit: string) {
  await open(page, "/accounting");
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: client });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Draft for ${client}`);
  await page.getByLabel("Line", { exact: true }).fill(text);
  await page.getByLabel("Unit (EUR)").fill(unit);
  // No VAT, so the open amounts are the round figures typed.
  await page.getByLabel("VAT", { exact: true }).selectOption("S0");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expectToast(page, "Line added");
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^INV\//);
  return (await heading.textContent())!.trim();
}

test("one transfer settles two invoices of a customer, one payment with a part on each", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Split Pay ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  const first = await issued(page, client, `Storage ${t}`, "100");
  const second = await issued(page, client, `Handling ${t}`, "50");

  await open(page, "/accounting/payments");
  await page.getByRole("link", { name: "Payment over several invoices" }).click();
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Show open invoices" }).click();
  await page.getByLabel(new RegExp(first.replace(/\//g, "\\/"))).fill("100");
  await page.getByLabel(new RegExp(second.replace(/\//g, "\\/"))).fill("20");
  await page.getByLabel("Reference").fill(`Transfer ${t}`);
  await page.getByRole("button", { name: "Book the payment" }).click();
  await expect(page).toHaveURL(/\/accounting\/payments$/);

  // One payment, both invoices named on its row.
  const row = page.getByRole("row").filter({ hasText: client });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(first);
  await expect(row).toContainText(second);
  await expect(row).toContainText("€120.00");

  // What is left on the second is still open.
  await open(page, `/accounting/payments/new`);
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Show open invoices" }).click();
  await expect(page.getByText(first)).toHaveCount(0);
  await expect(page.getByText(second)).toBeVisible();
  await expect(page.getByText("open €30.00")).toBeVisible();
});

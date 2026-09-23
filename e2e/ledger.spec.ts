import { expect, test } from "@playwright/test";
import { expectToast, login, submit, tag } from "./helpers";

test("an invoice and its payment land in the journal, the ledger and the margins", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Books Client ${t}`;
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await page.goto("/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("1250");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const sb = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await page.goto(`${page.url()}/billing`);
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);
  const number = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const invoiceUrl = page.url();

  // Nothing paid yet: the customer shows in the aged receivables.
  await page.goto("/accounting/aged");
  await expect(page.getByRole("row").filter({ hasText: client })).toContainText("€1,250.00");

  await page.goto(invoiceUrl);
  await page.getByLabel("Amount (EUR)").fill("1250");
  await submit(page, page.getByRole("button", { name: "Register payment" }));
  await expectToast(page, `Payment booked on ${number}`);

  // The journal: the invoice debits the customer and credits sales; the payment settles it.
  await page.goto("/accounting/journal");
  const invoiceHead = page.getByRole("row").filter({ hasText: `Invoice · ${client}` });
  await expect(invoiceHead).toContainText(number);
  await expect(page.getByRole("row").filter({ hasText: `Received from ${client}` })).toHaveCount(1);

  // The customers' ledger: debited then credited by the same amount.
  await page.getByRole("link", { name: "400000" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("400000 Customers");
  const rows = page.getByRole("row").filter({ hasText: number });
  await expect(rows).toHaveCount(2);

  // The reports balance, whatever else is in the books.
  await page.goto("/accounting/reports");
  const total = page.getByRole("row").filter({ hasText: /^Total/ });
  const cells = await total.getByRole("cell").allTextContents();
  expect(cells[2]).toBe(cells[3]); // debits = credits over the period

  // The margin: the shipment earned its sale, no cost yet.
  await page.goto("/accounting/margins");
  await expect(page.getByRole("row").filter({ hasText: sb })).toContainText("€1,250.00");
});

import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

const csv = (name: string, rows: string[]) => ({
  name,
  mimeType: "text/csv",
  buffer: Buffer.from(rows.join("\n")),
});

test("Odoo's contacts and open invoices come over; importing twice changes nothing", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Odoo Client ${t}`;
  const number = `INV/2019/${String(Date.now()).slice(-5)}`;
  const vat = `BE0${String(Date.now()).slice(-9)}`; // unique: a known VAT number is completed, not added
  await login(page);
  await page.goto("/accounting/odoo");

  const contacts = csv(`contacts-${t}.csv`, [
    "Name;VAT;Street;Zip;City;Country;Email",
    `${client};${vat};Kaai 1;2000;Antwerpen;BE;odoo-${t}@example.com`,
  ]);
  await page.getByLabel("Odoo contacts (CSV)").setInputFiles(contacts);
  await submit(page, page.getByRole("button", { name: "Import" }).first());
  await expectToast(page, /1 contacts added, 0 completed/);
  await page.goto("/accounting/odoo");
  await page.getByLabel("Odoo contacts (CSV)").setInputFiles(contacts);
  await submit(page, page.getByRole("button", { name: "Import" }).first());
  await expectToast(page, "0 contacts added, 0 completed from Odoo");

  const open = csv(`open-${t}.csv`, [
    "Number,Partner,Invoice Date,Due Date,Total,Amount Due,Status,Payment Status",
    `${number},${client},30/06/2019,31/07/2019,1210.00,1000.00,Posted,Partial`,
    `INV/2019/00000,Nobody ${t},30/06/2019,,50.00,50.00,Posted,Not Paid`,
  ]);
  // Each import from a fresh page: the one before refreshes the screen under the next file.
  await page.goto("/accounting/odoo");
  const invoices = page.getByLabel("Odoo open invoices (CSV)");
  await invoices.setInputFiles(open);
  await submit(page, page.getByRole("button", { name: "Import" }).nth(1));
  await expectToast(page, /1 open invoices brought over · €1,000\.00 — no contact for Nobody/);
  await page.goto("/accounting/odoo");
  await invoices.setInputFiles(open);
  await submit(page, page.getByRole("button", { name: "Import" }).nth(1));
  await expectToast(page, /0 open invoices brought over/);

  // Only the open part is owed, and it can be reminded and paid like any invoice.
  await page.goto("/accounting/aged");
  await expect(page.getByRole("row").filter({ hasText: client })).toContainText("€1,000.00");

  // A trial balance that does not balance is refused.
  await page.goto("/accounting/odoo");
  await page
    .getByLabel("Odoo trial balance (CSV)")
    .setInputFiles(csv(`tb-${t}.csv`, ["Account,Debit,Credit", "550000,100.00,0"]));
  await submit(page, page.getByRole("button", { name: "Import" }).nth(3));
  await expectToast(page, /does not balance \(off by 10000 cents\)/);
});

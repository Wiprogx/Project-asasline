import { expect, test } from "./fixtures";
import {
  choose,
  expectToast,
  fillMandatory,
  issue,
  login,
  open,
  pickCity,
  submit,
  tag,
  uniqueVat,
} from "./helpers";

test("an invoice is marked as sent by Peppol, and the year reads month by month", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Peppol State ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("VAT number").fill(uniqueVat("BE"));
  await page.getByLabel("Street").fill("Kaai 12");
  await page.getByLabel("Postcode").fill("2000");
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Antwerpen");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/accounting");
  await choose(page.getByLabel("Customer", { exact: true }), { label: client });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await page.getByLabel("Line", { exact: true }).fill("Customs clearance");
  await page.getByLabel("Unit (EUR)").fill("200");
  await choose(page.getByLabel("VAT"), "S21");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: "Customs clearance" })).toBeVisible();
  await issue(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);
  const number = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  // Ready, then sent on the day.
  await expect(page.getByText("Peppol file ready")).toBeVisible();
  await submit(page, page.getByRole("button", { name: "Sent by Peppol" }));
  await expectToast(page, `${number} marked as sent by Peppol`);
  await expect(page.getByText(/Sent by Peppol · \d{4}-\d{2}-\d{2}/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sent by Peppol" })).toHaveCount(0);
  await open(page, `/accounting?q=${encodeURIComponent(number)}`);
  await expect(
    page.getByRole("row").filter({ hasText: number }).getByText("Peppol", { exact: true }),
  ).toBeVisible();

  // The year month by month, the current month counting this invoice.
  await open(page, "/accounting/vat/by-month");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^VAT by month \d{4}$/);
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" })
    .format(new Date())
    .slice(0, 7);
  const row = page
    .getByRole("table", { name: "VAT by month" })
    .getByRole("row")
    .filter({ hasText: month });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: month }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`VAT return ${month}`);
});

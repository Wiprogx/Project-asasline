import { expect, test } from "./fixtures";
import { login, open, submit, tag, uniqueVat } from "./helpers";

test("a service to an EU business is on the intra-community listing and in the CSV export", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Berlin GmbH ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByLabel("Country (ISO-2)").fill("DE");
  const vat = uniqueVat("DE");
  await page.getByLabel("VAT number").fill(vat);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/accounting");
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: client });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await expect(page.getByLabel("VAT")).toHaveValue("RC"); // an EU business: reverse charge
  await page.getByLabel("Line", { exact: true }).fill("Customs brokerage Hamburg");
  await page.getByLabel("Unit (EUR)").fill("300");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: "Customs brokerage Hamburg" })).toBeVisible();
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);
  const number = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  await open(page, "/accounting/listings");
  const row = page.getByRole("row").filter({ hasText: client });
  await expect(row).toContainText(vat);
  await expect(row).toContainText("€300.00");
  const period = (await page
    .getByRole("heading", { name: /^Intra-community listing/ })
    .textContent())!.slice(-7);
  const xml = await (await page.request.get(`/accounting/listings/intra/${period}`)).text();
  expect(xml).toContain(
    `issuedBy="DE">${vat.slice(2)}</ns2:CompanyVATNumber><ns2:Code>S</ns2:Code><ns2:Amount>300.00`,
  );

  await open(page, "/accounting/journal");
  const href = await page
    .getByRole("link", { name: "Export for the accountant (CSV)" })
    .getAttribute("href");
  const csv = await (await page.request.get(href!)).text();
  expect(csv).toContain(`;SAL;${number};400000;Customers;Invoice · ${client};${client};300,00;`);
});

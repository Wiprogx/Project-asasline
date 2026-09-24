import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

test("the VAT return shows the quarter's grids and gives the Intervat file", async ({ page }) => {
  const t = tag();
  const client = `E2E VAT Client ${t}`;
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
  await page.getByLabel("Sell (EUR)").fill("800");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await page.goto(`${page.url()}/billing`);
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);

  // This quarter: the export shipping (art. 41) is in grid 47. It is not over, so not fileable.
  await page.goto("/accounting/vat");
  await page.getByRole("link", { name: "Next ›" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^VAT return \d{4}-Q\d$/);
  await expect(page.getByRole("row").filter({ hasText: /^47/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as filed" })).toHaveCount(0);

  const period = (await page.getByRole("heading", { level: 1 }).textContent())!.slice(-7);
  const res = await page.request.get(`/accounting/vat/${period}/intervat`);
  expect(res.headers()["content-type"]).toContain("application/xml");
  expect(await res.text()).toContain('GridNumber="47"');

  // The books close only through a past day.
  await page
    .getByLabel("Close the books through")
    .fill(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date()));
  await submit(page, page.getByRole("button", { name: "Close", exact: true }));
  await expectToast(page, "Only a day in the past can be closed.");
});

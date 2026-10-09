import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the KPIs count what was invoiced and the margin per customer and destination", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E KPI Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight Antwerp → Mersin");
  await page.getByLabel("Sell (EUR)").fill("1250");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const booking = page.url();

  await open(page, `${booking}/billing`);
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expectToast(page, /Issued as INV/);

  await open(page, "/accounting/kpis");
  await expect(page.getByText("Invoiced in the period")).toBeVisible();
  await expect(page.getByText("Days to get paid (DSO, last 90 days)")).toBeVisible();
  const customer = page
    .getByRole("table", { name: "Margin per customer" })
    .getByRole("row")
    .filter({ hasText: client });
  await expect(customer).toContainText("€1,250.00");
  await expect(customer).toContainText("100%");
  await expect(
    page
      .getByRole("table", { name: "Margin per destination" })
      .getByRole("row")
      .filter({ hasText: "TRMER" }),
  ).toBeVisible();
});

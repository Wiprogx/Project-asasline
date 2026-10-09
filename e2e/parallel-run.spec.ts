import { expect, test } from "./fixtures";
import { expectToast, login, open, submit } from "./helpers";

const day = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

test("the books say when they run alongside Odoo, and the invoices download for the accountant", async ({
  page,
}) => {
  await login(page);

  await open(page, "/settings/accounting");
  await page.getByLabel("Alongside Odoo until").fill(day(30));
  await submit(page, page.getByRole("button", { name: "Save books" }));
  await expectToast(page, "Books saved");
  await open(page, "/accounting");
  await expect(
    page.getByRole("status").filter({ hasText: `alongside Odoo until ${day(30)}` }),
  ).toBeVisible();

  await open(page, "/accounting/journal");
  const href = await page.getByRole("link", { name: "Invoices (CSV)" }).getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(await res.text()).toContain("Type;Number;Date;Partner;VAT number;Country;Net;VAT;Total");

  // Off again: the banner goes.
  await open(page, "/settings/accounting");
  await page.getByLabel("Alongside Odoo until").fill("");
  await submit(page, page.getByRole("button", { name: "Save books" }));
  await expectToast(page, "Books saved");
  await open(page, "/accounting");
  await expect(page.getByText(/alongside Odoo until/)).toHaveCount(0);
});

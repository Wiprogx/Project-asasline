import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, issue, login, open, submit, tag } from "./helpers";

test("a contact's invoices tab says what they owe us and lists what they paid", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Balance ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  const contactUrl = page.url();

  await open(page, "/accounting");
  await choose(page.getByLabel("Customer", { exact: true }), { label: client });
  await page.getByRole("button", { name: "New invoice" }).click();
  await page.getByLabel("Line", { exact: true }).fill(`Storage ${t}`);
  await page.getByLabel("Unit (EUR)").fill("100");
  await choose(page.getByLabel("VAT", { exact: true }), "S0");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expectToast(page, "Line added");
  await expect(page.getByRole("row").filter({ hasText: `Storage ${t}` })).toBeVisible();
  await issue(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);

  await page.getByLabel("Amount (EUR)").fill("40");
  await page.getByLabel("Reference").fill(`Part ${t}`);
  await submit(page, page.getByRole("button", { name: "Register payment" }));
  await expectToast(page, /Payment booked/);

  await open(page, `${contactUrl}/invoices`);
  const balance = page.locator("[data-slot=card]").filter({ hasText: "They owe us" });
  await expect(balance).toContainText("€60.00");
  await expect(
    page.locator("[data-slot=card]").filter({ hasText: "Payments" }).getByText(`Part ${t}`),
  ).toBeVisible();
});

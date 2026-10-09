import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a supplier's bill in dollars keeps its own rate, and the books carry the euro", async ({
  page,
}) => {
  const t = tag();
  const supplier = `E2E Forwarder US ${t}`;
  await login(page);

  // The office's rate for the dollar (legacy BOOKS.fx).
  await open(page, "/settings/accounting");
  await page.getByLabel("Euro for 1 USD").fill("0.9000");
  await submit(page, page.getByRole("button", { name: "Save books" }));
  await expectToast(page, "Books saved");

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(supplier);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: supplier })).toBeVisible();

  await open(page, "/accounting/bills");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "New bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);

  // In dollars: the office's rate is proposed, and kept on the document.
  await page.getByLabel("Currency").selectOption("USD");
  await expect(page.getByLabel("Euro for 1 USD")).toHaveValue("0.9000");
  await submit(page, page.getByRole("button", { name: "Set currency" }));
  await expectToast(page, "In USD at 1 USD = €0.9000");
  await expect(page.locator("dd").filter({ hasText: "1 USD = €0.9000" })).toBeVisible();

  // 1 000 USD + 21 % = 1 210 USD on the bill; the books carry 900 + 189 = 1 089 €.
  await page.getByLabel("Line", { exact: true }).fill("Destination charges");
  await page.getByLabel("Unit (USD)").fill("1000");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: "Destination charges" })).toBeVisible();
  await expect(page.getByText(/\$\s?1,210\.00/).first()).toBeVisible();
  await expect(page.getByText(/€\s?1,089\.00/).first()).toBeVisible();

  // Recorded, the bill keeps its currency and rate.
  await page.getByLabel("Supplier's number").fill(`US-${t}`);
  await submit(page, page.getByRole("button", { name: "Record bill" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^BILL\/\d{4}\/\d{5}$/);
  await expect(page.locator("dd").filter({ hasText: "1 USD = €0.9000" })).toBeVisible();
  await expect(page.getByText(/€\s?1,089\.00/).first()).toBeVisible();
});

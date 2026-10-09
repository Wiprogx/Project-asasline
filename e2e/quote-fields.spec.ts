import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the office says what the printed quotation shows", async ({ page }) => {
  const t = tag();
  const client = `E2E Paper Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const print = page.url().replace("/quotations/", "/print/quotations/");

  // Everything on: the price, the sales contact, the VAT note.
  await open(page, print);
  await expect(page.getByText("€900.00").first()).toBeVisible();
  await expect(page.getByText(/Sales contact:/)).toBeVisible();
  await expect(page.getByText(/article 41/)).toBeVisible();

  // The price and the VAT note switched off: the paper obeys.
  await open(page, "/settings/quotation-document");
  await page.getByLabel("The price").uncheck();
  await page.getByLabel("VAT note").uncheck();
  await submit(page, page.getByRole("button", { name: "Save the printed quotation" }));
  await expectToast(page, "Saved — the printed quotation");
  await open(page, print);
  await expect(page.getByText("Ocean freight to Mersin")).toBeVisible();
  await expect(page.getByText("€900.00")).toHaveCount(0);
  await expect(page.getByText(/article 41/)).toHaveCount(0);

  // Back on for the other journeys.
  await open(page, "/settings/quotation-document");
  await page.getByLabel("The price").check();
  await page.getByLabel("VAT note").check();
  await submit(page, page.getByRole("button", { name: "Save the printed quotation" }));
  await expectToast(page, "Saved — the printed quotation");
});

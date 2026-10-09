import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the office edits its payment terms, the books' figures and moves a counter forward", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // Something numbered, so a counter exists even on a database reset for this run.
  const client = `E2E Books ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);

  await open(page, "/settings/accounting");

  // The payment terms: the legacy seven, one added, then put back.
  const box = page.getByLabel("Payment terms, one per line");
  const before = await box.inputValue();
  await box.fill(`${before}\nd45 | 45 days | days | 45`);
  await submit(page, page.getByRole("button", { name: "Save payment terms" }));
  await expectToast(page, /Saved · \d+ payment terms/);
  await page.getByLabel("Payment terms, one per line").fill(before);
  await submit(page, page.getByRole("button", { name: "Save payment terms" }));
  await expectToast(page, /Saved/);

  // The books: a monthly VAT return shows a month on the VAT screen; back to quarterly after.
  await page.getByLabel("VAT return").selectOption("monthly");
  await submit(page, page.getByRole("button", { name: "Save books" }));
  await expectToast(page, "Books saved");
  await open(page, "/accounting/vat");
  await expect(page.getByText(/\b20\d{2}-(0[1-9]|1[0-2])\b/).first()).toBeVisible();
  await open(page, "/settings/accounting");
  await page.getByLabel("VAT return").selectOption("quarterly");
  await submit(page, page.getByRole("button", { name: "Save books" }));
  await expectToast(page, "Books saved");

  // A counter moves forward, never back.
  const options = page.getByLabel("Series").locator("option");
  await expect(options.nth(1)).toBeAttached();
  const firstKey = (await options.nth(1).getAttribute("value")) ?? "";
  const row = page.getByRole("row").filter({ hasText: firstKey });
  const last = Number(await row.getByRole("cell").nth(2).innerText());
  await page.getByLabel("Series").selectOption(firstKey);
  await page.getByLabel("Last issued becomes").fill(String(last - 1 > 0 ? last - 1 : 1));
  await submit(page, page.getByRole("button", { name: "Move the counter forward" }));
  await expectToast(page, /never moves back|already past/);
  await page.getByLabel("Last issued becomes").fill(String(last + 2));
  await submit(page, page.getByRole("button", { name: "Move the counter forward" }));
  await expectToast(page, /moved forward/);
  await expect(
    page.getByRole("row").filter({ hasText: firstKey }).getByRole("cell").nth(2),
  ).toHaveText(String(last + 2));
});

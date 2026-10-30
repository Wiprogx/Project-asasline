import { expect, test } from "./fixtures";
import { expectToast, fillMandatory, issue, login, newQuotation, open, tag } from "./helpers";

test("a customer over their credit limit is flagged on the booking, and an exempt invoice without its export proof says so", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // A customer with a 100 EUR credit limit.
  const client = `E2E Credit ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Credit limit (EUR)").fill("100");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // A 900 EUR destination accepted: the booking will invoice 900, nine times the limit.
  await newQuotation(page, {
    client: client,
    pol: "BEANR",
    pod: "TRMER",
    sell: "900",
    service: `Ocean freight ${t}`,
  });
  await page.getByRole("button", { name: "Accept → create booking" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await expect(page.getByText(/Over the credit limit/).first()).toBeVisible();
  const booking = page.url();

  // Issued exempt under art. 41 with nothing on file: the toast warns.
  await open(page, `${booking}/billing`);
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await issue(page);
  await expectToast(page, /Issued as INV.*export proof/);
});

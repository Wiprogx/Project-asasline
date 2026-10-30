import { expect, test } from "./fixtures";
import {
  choose,
  expectChosen,
  expectToast,
  fillMandatory,
  login,
  open,
  submit,
  tag,
} from "./helpers";

test("a customer's payment terms and last-price choice are set on the contact and kept", async ({
  page,
}) => {
  const name = `E2E Pricing ${tag()}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await choose(page.getByLabel("Payment terms"), { label: "30 days net" });
  await page.getByRole("checkbox", { name: /use the last price we quoted/ }).check();
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  await expectChosen(page.getByLabel("Payment terms"), "d30");
  await expect(page.getByRole("checkbox", { name: /use the last price we quoted/ })).toBeChecked();

  // Unticked and saved, it stays off.
  await page.getByRole("checkbox", { name: /use the last price we quoted/ }).uncheck();
  await submit(page, page.getByRole("button", { name: "Save", exact: true }));
  await expectToast(page, "Saved");
  await open(page, page.url());
  await expect(
    page.getByRole("checkbox", { name: /use the last price we quoted/ }),
  ).not.toBeChecked();
});

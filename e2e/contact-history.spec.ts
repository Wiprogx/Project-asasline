import { expect, test } from "./fixtures";
import { expectToast, fillMandatory, login, open, pickCity, submit, tag } from "./helpers";

test("a contact's history says what each edit changed, from and to", async ({ page }) => {
  const t = tag();
  const name = `E2E History ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Gent");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = page.url();

  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save", exact: true }) });
  // At page level: an open list hides the rest of the page, the form with it.
  await pickCity(page, "Brussel");
  await submit(page, form.getByRole("button", { name: "Save", exact: true }));
  await expectToast(page, "Saved");

  await open(page, `${url}/history`);
  await expect(page.getByText(/^Edited — .*City: Gent → Brussels/)).toBeVisible();
  await expect(page.getByText("Created")).toBeVisible();
});

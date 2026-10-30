import { expect, test } from "./fixtures";
import {
  choose,
  expectToast,
  fillMandatory,
  login,
  open,
  pickCity,
  submit,
  tag,
  uniqueVat,
} from "./helpers";

test("a VAT number is checked for its country and never given to two contacts", async ({
  page,
}) => {
  const t = tag();
  const vat = uniqueVat("BE");
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(`E2E Checked ${t}`);
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await page.getByLabel("VAT number").fill("BE0464648411");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByText(/fails the Belgian check digits/).first()).toBeVisible();

  // Typed with dots and spaces, kept clean.
  await page.getByLabel("VAT number").fill(`be ${vat.slice(2, 6)}.${vat.slice(6)}`);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2E Checked ${t}` })).toBeVisible();
  await expect(page.getByLabel("VAT number")).toHaveValue(vat);

  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(`E2E Twin ${t}`);
  await page.getByLabel("VAT number").fill(vat);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByText(`Already on E2E Checked ${t}`).first()).toBeVisible();
});

test("a location is added as a contact of its own, found through the company, and unlinked; a contact is called in one tap", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(`E2E Addresses ${t}`);
  await page.getByLabel("Mobile").fill("+32 470 12 34 56");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2E Addresses ${t}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call +32 470 12 34 56" })).toHaveAttribute(
    "href",
    "tel:+32470123456",
  );

  // A location added in one go, a contact of its own, linked with its role.
  await page.getByRole("button", { name: "+ Add" }).click();
  const dlg = page.getByRole("dialog");
  await choose(dlg.getByRole("combobox", { name: "Type" }), { label: "Location" });
  await choose(dlg.getByRole("combobox", { name: "Role" }), { label: "Delivery address" });
  await dlg.getByLabel("Name", { exact: true }).fill(`Warehouse ${t}`);
  await dlg.getByLabel("Street").fill("Kaai 12");
  await dlg.getByRole("combobox", { name: "Country" }).fill("be");
  await page.getByRole("option").first().click();
  await pickCity(page, "Zeebrugge", dlg);
  await submit(page, dlg.getByRole("button", { name: "Add", exact: true }));
  await expectToast(page, `Warehouse ${t} added as Delivery address`);
  // The related contact's row (not the toast that names it).
  const item = page
    .getByRole("listitem")
    .filter({ hasText: `Warehouse ${t}`, has: page.getByRole("button", { name: "Unlink" }) });
  await expect(item).toContainText("Kaai 12, 8380 Zeebrugge, BE");
  await expect(item).toContainText("Delivery address");

  // In the contacts list itself, and the company is found through it.
  await open(page, `/contacts?q=${encodeURIComponent(`Warehouse ${t}`)}`);
  await expect(page.getByRole("link", { name: `Warehouse ${t}` })).toBeVisible();
  await expect(page.getByRole("link", { name: `E2E Addresses ${t}` })).toBeVisible();
  await page.getByRole("link", { name: `E2E Addresses ${t}` }).click();

  await item.getByRole("button", { name: "Unlink" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Moved to Antwerp");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Unlink" }));
  await expectToast(page, "Unlinked");
  await expect(item).toHaveCount(0);
});

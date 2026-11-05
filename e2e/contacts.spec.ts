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

test("the list's columns and their widths are the person's own and survive a reload", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(`E2E Columns ${t}`);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2E Columns ${t}` })).toBeVisible();

  await open(page, "/contacts");
  const table = page.getByRole("table", { name: "Contacts" });
  await expect(table.getByRole("columnheader", { name: "Language" })).toHaveCount(0);
  await page.locator("summary", { hasText: "Columns" }).click();
  const picks = page.getByRole("group", { name: "Columns" });
  let saved = page.waitForResponse((r) => r.request().method() === "POST");
  await picks.getByLabel("Language").check();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Language" })).toBeVisible();

  // Dragged wider with the keyboard: three steps of 16 px from the default 90.
  const handle = page.getByRole("separator", { name: "Resize column Language" });
  saved = page.waitForResponse((r) => r.request().method() === "POST");
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "138");
  await saved;

  await open(page, "/contacts");
  await expect(table.getByRole("columnheader", { name: "Language" })).toBeVisible();
  await expect(page.getByRole("separator", { name: "Resize column Language" })).toHaveAttribute(
    "aria-valuenow",
    "138",
  );

  // A header orders the list, the order in the URL.
  await table.getByRole("button", { name: "Name" }).click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(table.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );

  // A right click on a cell leaves out the rows like it; the chip puts them back.
  await table
    .getByRole("row")
    .filter({ hasText: `E2E Columns ${t}` })
    .getByRole("cell")
    .first()
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Filter out · Type: Company" }).click();
  await expect(page).toHaveURL(/x\.type=company/);
  await expect(page.getByRole("row").filter({ hasText: `E2E Columns ${t}` })).toHaveCount(0);
  await page.getByRole("link", { name: /Not Type: Company/ }).click();
  await expect(page).not.toHaveURL(/x\.type/);
  await expect(table.getByRole("row").filter({ hasText: `E2E Columns ${t}` })).toBeVisible();

  // Reset puts the columns and the widths back.
  await page.locator("summary", { hasText: "Columns" }).click();
  saved = page.waitForResponse((r) => r.request().method() === "POST");
  await page.getByRole("button", { name: "Reset" }).click();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Language" })).toHaveCount(0);
});

test("a new contact's language follows its address: Dutch in Flanders, French in Brussels, until chosen by hand", async ({
  page,
}) => {
  const name = `E2E Flanders ${tag()}`;
  await login(page);
  await open(page, "/contacts/new");
  const lang = page.locator("#lang");
  await expect(lang).toHaveAttribute("data-value", "");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  // Belgium writes French; a Flemish postcode typed says Dutch before its city is even known
  // (8000 is Brugge and Koolkerke: no city is filled in, the postcode alone decides).
  await expect(lang).toHaveAttribute("data-value", "fr");
  await page.getByLabel("Postcode").fill("8000");
  await expect(lang).toHaveAttribute("data-value", "nl");
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue("");
  // A city of the Brussels region picked: French again.
  await pickCity(page, "Brussels");
  await expect(lang).toHaveAttribute("data-value", "fr");
  await page.getByLabel("Postcode").fill("9000");
  await expect(lang).toHaveAttribute("data-value", "nl");
  // Chosen by hand, the language no longer follows the address.
  await choose(lang, "fr");
  await page.getByLabel("Postcode").fill("2000");
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue(/^Antwerp/);
  await expect(lang).toHaveAttribute("data-value", "fr");
  // Left to the address, the server writes the same language on the saved contact.
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await page.getByLabel("Postcode").fill("2000");
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue(/^Antwerp/);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.locator("#lang")).toHaveAttribute("data-value", "nl");
});

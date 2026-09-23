import { expect, test } from "@playwright/test";
import { expectToast, login, submit, tag, uniqueVat } from "./helpers";

test("a VAT number is checked for its country and never given to two contacts", async ({
  page,
}) => {
  const t = tag();
  const vat = uniqueVat("BE");
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(`E2E Checked ${t}`);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByLabel("VAT number").fill("BE0464648411");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByText(/fails the Belgian check digits/).first()).toBeVisible();

  // Typed with dots and spaces, kept clean.
  await page.getByLabel("VAT number").fill(`be ${vat.slice(2, 6)}.${vat.slice(6)}`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2E Checked ${t}` })).toBeVisible();
  await expect(page.getByLabel("VAT number")).toHaveValue(vat);

  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(`E2E Twin ${t}`);
  await page.getByLabel("VAT number").fill(vat);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByText(`Already on E2E Checked ${t}`)).toBeVisible();
});

test("a contact's addresses are added and removed, and it can be called in one tap", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(`E2E Addresses ${t}`);
  await page.getByLabel("Mobile").fill("+32 470 12 34 56");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2E Addresses ${t}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call +32 470 12 34 56" })).toHaveAttribute(
    "href",
    "tel:+32470123456",
  );

  const card = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add address" }) });
  await card.getByLabel("Kind").selectOption("Delivery address");
  await card.getByLabel("Name").fill(`Warehouse ${t}`);
  await card.getByLabel("City").fill("Zeebrugge");
  await card.getByLabel("Country (ISO-2)").fill("be");
  await submit(page, card.getByRole("button", { name: "Add address" }));
  await expectToast(page, "Delivery address added");
  const item = page.getByRole("listitem").filter({ hasText: `Warehouse ${t}` });
  await expect(item).toContainText("Zeebrugge, BE");

  // Found by the contacts search through the child address.
  await page.goto(`/contacts?q=${encodeURIComponent(`Warehouse ${t}`)}`);
  await expect(page.getByRole("link", { name: `E2E Addresses ${t}` })).toBeVisible();
  await page.getByRole("link", { name: `E2E Addresses ${t}` }).click();

  await item.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Moved to Antwerp");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Remove" }));
  await expectToast(page, "Address removed");
  await expect(item).toHaveCount(0);
});

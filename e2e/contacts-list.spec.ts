import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("contacts are customers or suppliers, filtered field by field, in the columns or cards chosen", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Supplier ${t}`;
  const city = `Oostkamp${t}`;
  await login(page);

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Customer / Supplier").selectOption({ label: "Supplier" });
  await page.getByLabel("City").fill(city);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("Supplier", { exact: true }).first()).toBeVisible();

  // An address inside it: the search finds the contact and says which address answered.
  const card = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add address" }) });
  await card.getByLabel("Kind").selectOption("Delivery address");
  await card.getByLabel("Name").fill(`Loading dock ${t}`);
  await submit(page, card.getByRole("button", { name: "Add address" }));
  await expectToast(page, "Delivery address added");
  await open(page, `/contacts?q=${encodeURIComponent(`Loading dock ${t}`)}`);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toContainText(`↳ Loading dock ${t} (Delivery address)`);
  await expect(row).toContainText("Supplier");

  // Filters, one by one: the city picked from what the contacts hold, then the kind.
  await open(page, "/contacts");
  await page.getByLabel("Filter on").selectOption({ label: "City" });
  await page.getByLabel("Filter value").selectOption({ label: city });
  await page.getByRole("button", { name: "Add filter" }).click();
  await expect(page).toHaveURL(/f\.city=/);
  await expect(row).toBeVisible();
  await page.getByLabel("Filter on").selectOption({ label: "Customer/Supplier" });
  await page.getByLabel("Filter value").selectOption({ label: "Customer" });
  await page.getByRole("button", { name: "Add filter" }).click();
  await expect(page.getByText("No contacts match.")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Filters" })
    .getByRole("link", { name: /Customer\/Supplier: Customer/ })
    .click();
  await expect(row).toBeVisible();

  // The columns chosen, and the cards.
  await page.getByText("Choose the columns").click();
  await page.getByRole("checkbox", { name: "Addresses" }).check();
  await expect(page.getByRole("columnheader", { name: "Addresses" })).toBeVisible();
  await page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "Cards" }).click();
  await expect(page).toHaveURL(/view=cards/);
  const item = page.getByRole("listitem").filter({ hasText: name });
  await expect(item).toContainText("1 address");
  await expect(item).toContainText("Supplier");
});

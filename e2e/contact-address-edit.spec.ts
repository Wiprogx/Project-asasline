import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("an address under a contact is corrected in place, its note shown", async ({ page }) => {
  const t = tag();
  const name = `E2E Address Edit ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  const add = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add address" }) });
  await add.getByLabel("Kind").selectOption("Delivery address");
  await add.getByLabel("Name").fill(`Dock ${t}`);
  await add.getByLabel("City").fill("Zeebrugge");
  await submit(page, add.getByRole("button", { name: "Add address" }));
  await expectToast(page, "Delivery address added");

  const item = page.getByRole("listitem").filter({ hasText: `Dock ${t}` });
  await item.getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("City").fill("Oostende");
  await dialog.getByLabel("Note").fill("Gate 4, ask for Pieter");
  await submit(page, dialog.getByRole("button", { name: "Save address" }));
  await expectToast(page, "Address saved");
  await expect(item).toContainText("Oostende");
  await expect(item).not.toContainText("Zeebrugge");
  await expect(item).toContainText("Gate 4, ask for Pieter");
});

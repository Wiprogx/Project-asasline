import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a cancel reason is added, reworded, archived with a reason and put back — never deleted", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  await open(page, "/settings/lists/cancel-reasons");
  await expect(page.getByRole("row", { name: /Goods not ready/ })).toBeVisible();

  await page.getByLabel("Reason").fill(`Vessel full ${t}`);
  await submit(page, page.getByRole("button", { name: "Add reason" }));
  await expectToast(page, `Added · Vessel full ${t}`);
  let row = page.getByRole("row", { name: new RegExp(`Vessel full ${t}`) });
  await expect(row).toBeVisible();

  // The same words twice are refused, whatever the case.
  await page.getByLabel("Reason").fill(`VESSEL FULL ${t}`);
  await submit(page, page.getByRole("button", { name: "Add reason" }));
  await expectToast(page, "These words are already in the list.");

  await row.getByRole("button", { name: "Edit" }).click();
  let dlg = page.getByRole("dialog");
  await dlg.getByLabel("Reason").fill(`Vessel overbooked ${t}`);
  await submit(page, dlg.getByRole("button", { name: "Save" }));
  await expectToast(page, "Saved");
  row = page.getByRole("row", { name: new RegExp(`Vessel overbooked ${t}`) });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Archive" }).click();
  dlg = page.getByRole("dialog");
  await dlg.getByRole("textbox").fill("The carrier no longer overbooks");
  await submit(page, dlg.getByRole("button", { name: "Archive" }));
  await expectToast(page, "Archived — no longer offered");
  await expect(row).toContainText("Archived");
  await expect(row).toContainText("The carrier no longer overbooks");

  await submit(page, row.getByRole("button", { name: "Put back" }));
  await expectToast(page, "Offered again");
  await expect(row).not.toContainText("Archived");
  await expect(row.getByRole("button", { name: "Archive" })).toBeVisible();
});

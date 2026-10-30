import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a row added to a Settings list is offered on the booking screen, and leaves it when archived", async ({
  page,
}) => {
  const t = tag();
  const code = `E2E${t.slice(-4).toUpperCase()}`;
  await login(page);
  await open(page, "/settings/lists/container-types");
  await expect(page.getByRole("row", { name: /40HC/ })).toContainText("Used by the app");
  await page.getByLabel("Container type").fill(code);
  await submit(page, page.getByRole("button", { name: "Add container type" }));
  await expectToast(page, `Added · ${code}`);

  await open(page, "/bookings/new");
  await page.getByLabel("Container type").click();
  await expect(page.getByRole("option", { name: code, exact: true })).toHaveCount(1);
  await page.keyboard.press("Escape");

  // Archived with a reason (never deleted): no longer offered, so repeated runs do not grow it.
  await open(page, "/settings/lists/container-types");
  const row = page.getByRole("row", { name: new RegExp(code) });
  await row.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Test row, not a real box");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Archive" }));
  await expectToast(page, "Archived — no longer offered");
  await open(page, "/bookings/new");
  await page.getByLabel("Container type").click();
  await expect(page.getByRole("option", { name: code, exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

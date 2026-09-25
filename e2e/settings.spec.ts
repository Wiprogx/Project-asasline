import { expect, test } from "./fixtures";
import { expectToast, login, open, tag } from "./helpers";

test("an Admin adds a person, who signs in and cannot open Settings", async ({ page, browser }) => {
  const t = tag();
  const email = `clerk.${t}@e2e.test`;
  const password = `pw-${t}-${t}`; // generated per run: a throwaway account, no literal to leak
  await login(page);
  await open(page, "/settings/people");
  await page.getByLabel("Name").fill(`Clerk ${t}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("First password").fill(password);
  await page.getByRole("button", { name: "Add person" }).click();
  await expectToast(page, /can now sign in/);

  const clerk = await (await browser.newContext()).newPage();
  await login(clerk, { email, password });
  await expect(clerk.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await open(clerk, "/settings/people");
  await expect(clerk).toHaveURL(/\/\?denied=/);

  // Switched off: the open session ends at once.
  const row = page.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: "Switch off" }).click();
  await expectToast(page, "Switched off and signed out");
  await open(clerk, "/contacts");
  await expect(clerk).toHaveURL(/\/login$/);
});

test("the Admin cannot switch themselves off", async ({ page }) => {
  await login(page);
  await open(page, "/settings/people");
  const me = page.getByRole("row").filter({ hasText: "(you)" });
  await expect(me.getByRole("button", { name: "Switch off" })).toBeDisabled();
});

test("a list saved in Settings is offered on the booking screen", async ({ page }) => {
  const t = tag();
  await login(page);
  await open(page, "/settings/lists");
  const box = page.getByLabel("Container types, one per line");
  const before = await box.inputValue();
  await box.fill(`${before}\nE2E${t.slice(-4).toUpperCase()}`);
  await page.getByRole("button", { name: "Save" }).nth(1).click();
  await expectToast(page, /Saved · \d+ entries/);
  await open(page, "/bookings/new");
  await expect(
    page
      .getByLabel("Container type")
      .locator("option", { hasText: `E2E${t.slice(-4).toUpperCase()}` }),
  ).toHaveCount(1);
  // Restore the list so repeated runs do not grow it.
  await open(page, "/settings/lists");
  await page.getByLabel("Container types, one per line").fill(before);
  await page.getByRole("button", { name: "Save" }).nth(1).click();
  await expectToast(page, /Saved/);
});

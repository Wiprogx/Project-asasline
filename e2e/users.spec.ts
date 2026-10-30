import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { choose, expectToast, login, open, tag } from "./helpers";

/** Adds a user from Settings › Users with a temporary password typed here; returns its email. */
async function addUser(page: Page, t: string, password: string, role = "Docs clerk") {
  const email = `user.${t}@e2e.test`;
  await open(page, "/settings/users");
  await page.getByRole("button", { name: "+ Add user" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel(/^Full name/).fill(`User ${t}`);
  await dlg.getByLabel("Email", { exact: true }).fill(email);
  await choose(dlg.getByRole("combobox", { name: /^Role/ }), { label: role });
  await dlg.getByLabel("Job title").fill("Operations");
  await dlg.getByLabel("Temporary password").fill(password);
  await dlg.getByRole("button", { name: "Add user" }).click();
  await expectToast(page, /can now sign in/);
  return email;
}

test("a new user signs in with the temporary password, must choose their own, and cannot open Settings", async ({
  page,
  browser,
}) => {
  const t = tag();
  const temporary = `tmp-${t}-${t}`; // per run: a throwaway account, no literal to leak
  await login(page);
  const email = await addUser(page, t, temporary);
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row).toContainText("Temporary password");
  await expect(row).toContainText("Operations");

  const user = await (await browser.newContext()).newPage();
  await open(user, "/login");
  await user.getByLabel("Email").fill(email);
  await user.getByLabel("Password").fill(temporary);
  await user.getByRole("button", { name: "Sign in" }).click();
  await expect(user).toHaveURL(/\/change-password$/);
  // Nothing else opens until they choose their own.
  await open(user, "/contacts");
  await expect(user).toHaveURL(/\/change-password$/);
  await user.getByLabel("New password").fill(temporary);
  await user.getByLabel("The same again").fill(temporary);
  await user.getByRole("button", { name: "Save and continue" }).click();
  await expect(user.getByRole("alert").filter({ hasText: "not the temporary one" })).toBeVisible();
  const own = `own-${t}-${t}`;
  await user.getByLabel("New password").fill(own);
  await user.getByLabel("The same again").fill(own);
  await user.getByRole("button", { name: "Save and continue" }).click();
  await expect(user).toHaveURL(/\/$/);
  await expect(user.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await open(user, "/settings/users");
  await expect(user).toHaveURL(/\/\?denied=/);

  // Switched off with a reason: the open session ends at once.
  await open(page, "/settings/users");
  await page
    .getByRole("row")
    .filter({ hasText: email })
    .getByRole("button", { name: "Switch off" })
    .click();
  await page.getByRole("dialog").getByRole("textbox").fill("Left the office");
  await page.getByRole("dialog").getByRole("button", { name: "Switch off" }).click();
  await expectToast(page, "Switched off and signed out");
  await expect(page.getByRole("row").filter({ hasText: email })).toContainText("Left the office");
  await open(user, "/contacts");
  await expect(user).toHaveURL(/\/login$/);
});

test("an Admin edits a user and resets the password with a link, used once", async ({
  page,
  browser,
}) => {
  const t = tag();
  await login(page);
  const email = await addUser(page, t, `tmp-${t}-${t}`);
  const row = page.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: "Edit" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Job title").fill("Accounting");
  await dlg.getByLabel("Email signature").fill(`User ${t}\nASASLINE S.A.`);
  await dlg.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Saved");
  await expect(row).toContainText("Accounting");

  // No mail server on the suite: the link is handed over to pass on.
  await row.getByRole("button", { name: "Password" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Send the link" }).click();
  const link = await page.getByRole("dialog").locator("code").innerText();
  expect(link).toMatch(/\/reset-password\?token=/);
  await page.keyboard.press("Escape");

  const user = await (await browser.newContext()).newPage();
  await open(user, link.replace(/^https?:\/\/[^/]+/, ""));
  const own = `own-${t}-${t}`;
  await user.getByLabel("New password").fill(own);
  await user.getByLabel("The same again").fill(own);
  await user.getByRole("button", { name: "Save my new password" }).click();
  await expect(user.getByText("Your new password is saved")).toBeVisible();
  await login(user, { email, password: own });
  // The same link twice: it no longer works.
  await open(user, link.replace(/^https?:\/\/[^/]+/, ""));
  await expect(user.getByText("This link no longer works")).toBeVisible();
});

test("forgot password answers the same for any email; an Admin cannot switch themselves off", async ({
  page,
}) => {
  await open(page, "/forgot-password");
  await page.getByLabel("Email").fill(`nobody.${tag()}@e2e.test`);
  await page.getByRole("button", { name: "Send me a link" }).click();
  await expect(page.getByText(/If that email belongs to an account/)).toBeVisible();

  await login(page);
  await open(page, "/settings/users");
  const me = page.getByRole("row").filter({ hasText: "(you)" });
  await expect(me.getByRole("button", { name: "Switch off" })).toHaveCount(0);
});

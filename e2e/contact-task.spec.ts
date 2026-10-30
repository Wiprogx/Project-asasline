import { expect, test } from "./fixtures";
import { expectToast, fillMandatory, login, open, submit, tag } from "./helpers";

test("a task is added on a contact itself, and the contact's tab lists it with its link", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Contact Task ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = page.url();

  // "+ Activity" in the header opens the Tasks tab with the cursor in the task's words.
  await page.getByRole("link", { name: "+ Activity" }).click();
  await expect(page).toHaveURL(/\/tasks\?new=1$/);
  await expect(page.locator("form[data-action-form]").first()).toHaveAttribute(
    "data-hydrated",
    "1",
  );
  await expect(page.getByLabel("New task")).toBeFocused();
  const title = `Call about the new rates ${t}`;
  await page.getByLabel("New task").fill(title);
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");
  const own = page.getByRole("region", { name: /On the contact itself/ });
  const item = own.getByRole("listitem").filter({ hasText: title });
  await expect(item.getByRole("link", { name })).toHaveAttribute("href", new URL(url).pathname);

  // It is in the activity list too, linked to the contact.
  await open(page, `/activity?q=${encodeURIComponent(title)}`);
  await expect(
    page.getByRole("listitem").filter({ hasText: title }).getByRole("link", { name }),
  ).toBeVisible();
});

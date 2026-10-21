import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a task is added on a contact itself, and the contact's tab lists it with its link", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Contact Task ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = page.url();

  await open(page, `${url}/tasks`);
  const title = `Call about the new rates ${t}`;
  await page.getByLabel("New task").fill(title);
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");
  const item = page.getByRole("listitem").filter({ hasText: title });
  await expect(item.getByRole("link", { name })).toHaveAttribute("href", new URL(url).pathname);

  // It is in the activity list too, linked to the contact.
  await open(page, `/activity?q=${encodeURIComponent(title)}`);
  await expect(
    page.getByRole("listitem").filter({ hasText: title }).getByRole("link", { name }),
  ).toBeVisible();
});

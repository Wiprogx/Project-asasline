import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const officeToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

test("the bell counts what wants me today and opens the activity list", async ({ page }) => {
  const title = `E2E Bell ${tag()}`;
  await login(page);
  await open(page, "/activity");
  await page.getByLabel("New task").fill(title);
  await page.getByLabel("Due", { exact: true }).fill(officeToday());
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");

  await open(page, "/");
  const bell = page.getByRole("link", { name: /to do:.*due today/ });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByText(title)).toBeVisible();
});

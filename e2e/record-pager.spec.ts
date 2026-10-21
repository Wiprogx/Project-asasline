import { expect, test } from "./fixtures";
import { login, open, tag } from "./helpers";

test("a record opened from a list steps to the next one in that list, by link or arrow key", async ({
  page,
}) => {
  const t = tag();
  const names = [`E2E Pager A ${t}`, `E2E Pager B ${t}`];
  await login(page);
  for (const name of names) {
    await open(page, "/contacts/new");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }

  // Searched by this run's tag: exactly these two, A then B.
  await open(page, `/contacts?q=${encodeURIComponent(t)}`);
  await page.getByRole("link", { name: names[0] }).click();
  await expect(page.getByRole("heading", { level: 1, name: names[0] })).toBeVisible();
  const pager = page.getByRole("navigation", { name: "Record pager" });
  await expect(pager).toContainText("1 / 2");

  // The arrow key steps when no field has the cursor.
  await page.locator("body").press("ArrowRight");
  await expect(page.getByRole("heading", { level: 1, name: names[1] })).toBeVisible();
  await expect(pager).toContainText("2 / 2");

  await pager.getByRole("link", { name: "Previous in the list" }).click();
  await expect(page.getByRole("heading", { level: 1, name: names[0] })).toBeVisible();
});

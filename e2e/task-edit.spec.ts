import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { choose, expectToast, login, open, submit, tag } from "./helpers";

const row = (page: Page, title: string) => page.getByRole("listitem").filter({ hasText: title });

test("a task's words, type, due day and note are corrected in place", async ({ page }) => {
  const title = `E2E edit task ${tag()}`;
  await login(page);
  await open(page, "/activity");
  await page.getByLabel("New task").fill(title);
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");

  await row(page, title).getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What needs doing").fill(`${title} — corrected`);
  await choose(dialog.getByLabel("Type"), "Call");
  await dialog.getByLabel("Due").fill("2031-01-15");
  await dialog.getByLabel("Note").fill("Ask for the packing list too");
  await submit(page, dialog.getByRole("button", { name: "Save task" }));
  await expectToast(page, "Task saved");
  // An upcoming bucket shows its first tasks only; the search finds this one wherever it falls.
  await open(page, `/activity?q=${encodeURIComponent(title)}`);

  const fixed = row(page, `${title} — corrected`);
  await expect(fixed).toContainText("2031-01-15");
  await expect(fixed).toContainText("Call");
  await expect(fixed).toContainText("Ask for the packing list too");
});

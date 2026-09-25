import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

async function addPerson(page: Page, name: string, email: string, password: string) {
  await open(page, "/settings/people");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.locator("#p-role").selectOption("docs_clerk");
  await page.getByLabel("First password").fill(password);
  await submit(page, page.getByRole("button", { name: "Add person" }));
  await expectToast(page, `${name} can now sign in`);
}

test("a colleague covers somebody away: their tasks are in the colleague's list until they are back", async ({
  page,
  browser,
}) => {
  const t = tag();
  const away = `Away ${t}`;
  const cover = `Cover ${t}`;
  const password = `pw-${t}-${t}`;
  await login(page);
  await addPerson(page, away, `away.${t}@e2e.test`, password);
  await addPerson(page, cover, `cover.${t}@e2e.test`, password);

  const title = `E2E covered task ${t}`;
  await open(page, "/activity");
  await page.getByLabel("New task").fill(title);
  await page.getByLabel("Person").selectOption({ label: away });
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");

  await page.getByLabel("Who is away").selectOption({ label: away });
  await page.getByLabel("Who covers").selectOption({ label: cover });
  await submit(page, page.getByRole("button", { name: "Someone is away" }));
  await expectToast(page, `${cover} covers for ${away}`);
  const line = page.getByRole("listitem").filter({ hasText: `${away} is away` });
  await expect(line).toContainText(`${cover} covers · 1 open task`);

  // The colleague sees it in "My tasks"; nothing was moved.
  const colleague = await (await browser.newContext()).newPage();
  await login(colleague, { email: `cover.${t}@e2e.test`, password });
  await open(colleague, `/activity?q=${encodeURIComponent(title)}`);
  await expect(colleague.getByText(title)).toBeVisible();

  // Back: it leaves the colleague's list at once.
  await submit(page, line.getByRole("button", { name: "Back now" }));
  await expectToast(page, "Back — the tasks are theirs again");
  await colleague.reload();
  await expect(colleague.getByText(title)).toHaveCount(0);

  // Leaving for good: every open task moves, once.
  await page.getByLabel("Hand over everything of").selectOption({ label: away });
  await page.getByLabel("To", { exact: true }).selectOption({ label: cover });
  await submit(page, page.getByRole("button", { name: "Hand over for good" }));
  await expectToast(page, `1 open task handed over to ${cover}`);
  await colleague.reload();
  await expect(colleague.getByText(title)).toBeVisible();
});

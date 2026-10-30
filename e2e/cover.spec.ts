import { expect, test } from "./fixtures";
import { addUser, choose, expectToast, firstSignIn, login, open, submit, tag } from "./helpers";

test("a colleague covers somebody away: their tasks are in the colleague's list until they are back", async ({
  page,
  browser,
}) => {
  const t = tag();
  const away = `Away ${t}`;
  const cover = `Cover ${t}`;
  const password = `pw-${t}-${t}`;
  await login(page);
  await addUser(page, { name: away, email: `away.${t}@e2e.test`, password });
  await addUser(page, { name: cover, email: `cover.${t}@e2e.test`, password });

  const title = `E2E covered task ${t}`;
  await open(page, "/activity");
  await page.getByLabel("New task").fill(title);
  await choose(page.getByLabel("Person"), { label: away });
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");

  await choose(page.getByLabel("Who is away"), { label: away });
  await choose(page.getByLabel("Who covers"), { label: cover });
  await submit(page, page.getByRole("button", { name: "Someone is away" }));
  await expectToast(page, `${cover} covers for ${away}`);
  const line = page.getByRole("listitem").filter({ hasText: `${away} is away` });
  await expect(line).toContainText(`${cover} covers · 1 open task`);

  // The colleague sees it in "My tasks"; nothing was moved.
  const colleague = await (await browser.newContext()).newPage();
  await firstSignIn(colleague, `cover.${t}@e2e.test`, password);
  await open(colleague, `/activity?q=${encodeURIComponent(title)}`);
  await expect(colleague.getByText(title)).toBeVisible();

  // Back: it leaves the colleague's list at once.
  await submit(page, line.getByRole("button", { name: "Back now" }));
  await expectToast(page, "Back — the tasks are theirs again");
  await colleague.reload();
  await expect(colleague.getByText(title)).toHaveCount(0);

  // Leaving for good: every open task moves, once.
  await choose(page.getByLabel("Hand over everything of"), { label: away });
  await choose(page.getByLabel("To", { exact: true }), { label: cover });
  await submit(page, page.getByRole("button", { name: "Hand over for good" }));
  await expectToast(page, `1 open task handed over to ${cover}`);
  await colleague.reload();
  await expect(colleague.getByText(title)).toBeVisible();
});

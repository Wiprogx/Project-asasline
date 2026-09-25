import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

/** The office's today, as the server computes it (Europe/Brussels). */
const officeToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

const row = (page: Page, title: string) => page.getByRole("listitem").filter({ hasText: title });

test("a task from creation to done, withdrawn, put back and handed over", async ({ page }) => {
  const title = `E2E task ${tag()}`;
  await login(page);
  await open(page, "/activity");
  await page.getByLabel("New task").fill(title);
  await page.getByLabel("Due", { exact: true }).fill(officeToday());
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");

  // Mine by default, in the Today bucket.
  const today = page.getByRole("region", { name: /Today/ });
  await expect(today.getByText(title)).toBeVisible();

  await submit(page, row(page, title).getByRole("button", { name: "Done" }));
  await expectToast(page, "Done");
  await expect(page.getByText(title)).toHaveCount(0);
  await open(page, "/activity?state=done");
  await expect(row(page, title).getByText(/done by/)).toBeVisible();
  await submit(page, row(page, title).getByRole("button", { name: "Reopen" }));
  await expectToast(page, "Reopened");

  await open(page, "/activity");
  await row(page, title).getByRole("button", { name: "Withdraw" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Customer will send it himself");
  await page.getByRole("dialog").getByRole("button", { name: "Withdraw" }).click();
  await expectToast(page, "Withdrawn");
  await open(page, "/activity?state=withdrawn");
  await expect(
    row(page, title).getByText("withdrawn — Customer will send it himself"),
  ).toBeVisible();
  await submit(page, row(page, title).getByRole("button", { name: "Put back" }));
  await expectToast(page, "Put back");

  // Handed to a role: it leaves "mine" (Admin) unless the role is the Admin's own.
  await open(page, "/activity");
  await row(page, title).getByRole("button", { name: "Hand over" }).click();
  await page.getByRole("dialog").getByLabel("Or to a role").selectOption({ label: "Accountant" });
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Hand over" }));
  await expectToast(page, "Handed over");
  await expect(page.getByText(title)).toHaveCount(0);
  await open(page, `/activity?who=all&q=${encodeURIComponent(title)}`);
  await expect(row(page, title).getByText("Accountant · anyone")).toBeVisible();
});

test("the calendar shows a task on its day", async ({ page }) => {
  const title = `E2E calendar ${tag()}`;
  const day = officeToday();
  await login(page);
  await open(page, `/activity/calendar?day=${day}`);
  await page.getByLabel("New task").fill(title);
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");
  await expect(page.getByRole("gridcell", { name: new RegExp(`^${day}: [1-9]`) })).toBeVisible();
  await expect(
    page.getByRole("region", { name: `Tasks on ${day}` }).getByText(title),
  ).toBeVisible();
});

test("cancelling a booking withdraws its open tasks with the reason", async ({ page }) => {
  const t = tag();
  const client = `E2E Task Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);

  await page.getByRole("link", { name: "Tasks" }).click();
  await page.getByLabel("New task").fill(`Send VGM ${t}`);
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");

  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption({ label: "Goods not ready" });
  await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click();
  await expectToast(page, "Booking cancelled");
  await page.reload();
  // Our own task, and the engine's open steps with it (every one says why).
  await expect(row(page, `Send VGM ${t}`)).toContainText(
    "withdrawn — Booking cancelled: Goods not ready",
  );
  await expect(
    page.getByText("withdrawn — Booking cancelled: Goods not ready").nth(1),
  ).toBeVisible();
});

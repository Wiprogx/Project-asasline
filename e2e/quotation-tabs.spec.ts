import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a quotation has its tasks, its messages and its history under tabs", async ({ page }) => {
  const t = tag();
  const client = `E2E Tabs Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const base = page.url();
  const tabs = page.getByRole("navigation", { name: "Section" });
  for (const name of ["Quotation", "Tasks", "Messages", "History"])
    await expect(tabs.getByRole("link", { name })).toBeVisible();

  // Tasks: the automatic one from the rules, and one added by hand on the quotation.
  await tabs.getByRole("link", { name: "Tasks" }).click();
  await expect(page).toHaveURL(`${base}/tasks`);
  await expect(
    page.getByRole("listitem").filter({ hasText: `Send quotation ${ref} to ${client}` }),
  ).toBeVisible();
  const title = `Check the Mersin rates ${t}`;
  await page.getByLabel("New task").fill(title);
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");
  await expect(page.getByRole("listitem").filter({ hasText: title })).toBeVisible();

  // Messages: nothing yet, a note logged as it came in.
  await open(page, `${base}/messages`);
  await expect(page.getByText("No messages on this quotation yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log a message received" })).toBeVisible();

  // History: the creation is the first line.
  await open(page, `${base}/history`);
  await expect(page.getByText(`Created ${ref}`)).toBeVisible();
});

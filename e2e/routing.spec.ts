import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

test("the routing table sends a topic to a role, takes new topics, and keeps OTHER on", async ({
  page,
}) => {
  const code = `T${tag()}`.toUpperCase().slice(0, 18);
  await login(page);
  await page.goto("/settings/routing");

  await page.getByLabel("INVOICE goes to").selectOption("docs_clerk");
  await page.getByRole("button", { name: "+ Topic" }).click();
  await page
    .getByLabel(/^Topic code/)
    .last()
    .fill(code);
  await page.getByLabel("What it is about").last().fill("Customs questions");
  await page.getByLabel("New topic goes to").last().selectOption("docs_clerk");
  await page.getByLabel("Team lead sees it after (minutes)").fill("45");
  await submit(page, page.getByRole("button", { name: "Save routing" }));
  await expectToast(page, "Routing saved");

  await page.reload();
  await expect(page.getByLabel("INVOICE goes to")).toHaveValue("docs_clerk");
  await expect(page.getByLabel(`${code} goes to`)).toHaveValue("docs_clerk");
  await expect(page.getByLabel(`${code} on`)).toBeChecked();
  await expect(page.getByLabel("Team lead sees it after (minutes)")).toHaveValue("45");

  // A message with no topic must still reach someone.
  await page.getByLabel("OTHER on").uncheck();
  await submit(page, page.getByRole("button", { name: "Save routing" }));
  await expectToast(page, /Keep OTHER on/);

  // Put the office back as it was.
  await page.reload();
  await page.getByLabel("INVOICE goes to").selectOption("accountant");
  await page.getByLabel(`${code} on`).uncheck();
  await page.getByLabel("Team lead sees it after (minutes)").fill("30");
  await submit(page, page.getByRole("button", { name: "Save routing" }));
  await expectToast(page, "Routing saved");
});

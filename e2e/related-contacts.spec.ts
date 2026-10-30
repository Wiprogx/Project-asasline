import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, submit, tag } from "./helpers";

test("a person is added with the full form, completed with Edit, and linked to a second company", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  const companies = [`E2E Related A ${t}`, `E2E Related B ${t}`];
  for (const name of companies) {
    await open(page, "/contacts/new");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await fillMandatory(page);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }

  // On the second company: a new person, at its address, with a role.
  await page.getByRole("button", { name: "+ Add" }).click();
  let dlg = page.getByRole("dialog");
  await choose(dlg.getByRole("combobox", { name: "Role" }), { label: "Accounting" });
  await dlg.getByLabel("Last name").fill(`Peeters ${t}`);
  await dlg.getByLabel("Email").fill(`peeters.${t}@e2e.test`);
  // The full form, as Edit: first name, job title… and the company's address to start from.
  await expect(dlg.getByLabel("Job title")).toBeVisible();
  await expect(dlg.getByLabel("Street")).not.toHaveValue("");
  await submit(page, dlg.getByRole("button", { name: "Add", exact: true }));
  await expectToast(page, `Peeters ${t} added as Accounting`);
  // The related contact's row (not the toast that names it).
  const item = page
    .getByRole("listitem")
    .filter({ hasText: `Peeters ${t}`, has: page.getByRole("button", { name: "Unlink" }) });
  await expect(item).toContainText("Accounting");

  // Completed with Edit: the full form.
  await item.getByRole("button", { name: "Edit" }).click();
  dlg = page.getByRole("dialog");
  await dlg.getByLabel("First name").fill("Jan");
  await dlg.getByLabel("Job title").fill("Chief accountant");
  await dlg.getByLabel("Note").fill("Calls back after 14:00");
  await submit(page, dlg.getByRole("button", { name: "Save" }));
  await expectToast(page, "Saved");
  await expect(item).toContainText(`Jan Peeters ${t}`);
  await expect(item).toContainText("Chief accountant");

  // The same person linked to the first company, as an existing contact.
  await page.getByRole("link", { name: `Jan Peeters ${t}` }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Jan Peeters ${t}` })).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: companies[1], has: page.getByRole("button", { name: "Unlink" }) }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ Add" }).click();
  dlg = page.getByRole("dialog");
  await choose(dlg.getByRole("combobox", { name: "Type" }), { label: "Company" });
  await choose(dlg.getByRole("combobox", { name: "Role" }), { label: "Director" });
  await dlg.getByRole("combobox", { name: /The company/ }).fill(companies[0]);
  await page.getByRole("option", { name: new RegExp(companies[0]) }).click();
  await submit(page, dlg.getByRole("button", { name: "Add", exact: true }));
  await expectToast(page, "Linked as Director");
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: companies[0], has: page.getByRole("button", { name: "Unlink" }) }),
  ).toContainText("Director");
});

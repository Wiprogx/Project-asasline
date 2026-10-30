import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, pickCity, submit, tag } from "./helpers";

test("contacts are filtered by type and field by field, found through what is linked to them, in the columns or cards chosen", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Listed ${t}`;
  const city = `Oostkamp${t}`;
  await login(page);

  // A town of its own, so the city filter finds this contact alone (Settings › Countries).
  await open(page, "/settings/countries/BE");
  await page.getByRole("button", { name: "Add a city" }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill(city);
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Add" }));
  await expectToast(page, `Added · ${city}`);

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, city);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  // A location linked to it: the search finds the company and says which linked contact answered.
  await page.getByRole("button", { name: "+ Add" }).click();
  const dlg = page.getByRole("dialog");
  await choose(dlg.getByRole("combobox", { name: "Type" }), { label: "Location" });
  await choose(dlg.getByRole("combobox", { name: "Role" }), { label: "Delivery address" });
  await dlg.getByLabel("Name", { exact: true }).fill(`Loading dock ${t}`);
  await dlg.getByLabel("Street").fill("Kaai 3");
  await dlg.getByRole("combobox", { name: "Country" }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Zeebrugge", dlg);
  await submit(page, dlg.getByRole("button", { name: "Add", exact: true }));
  await expectToast(page, `Loading dock ${t} added as Delivery address`);
  await open(page, `/contacts?q=${encodeURIComponent(`Loading dock ${t}`)}`);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toContainText(`↳ Loading dock ${t} (Delivery address)`);
  await expect(row.getByRole("img", { name: "Company" })).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: `Loading dock ${t}` })
      .getByRole("img", { name: "Location" })
      .first(),
  ).toBeVisible();

  // Filters, one by one: the city picked from what the contacts hold, then the type.
  await open(page, "/contacts");
  await choose(page.getByLabel("Filter on"), { label: "City" });
  await choose(page.getByLabel("Filter value"), { label: city });
  await page.getByRole("button", { name: "Add filter" }).click();
  await expect(page).toHaveURL(/f\.city=/);
  await expect(row).toBeVisible();
  await choose(page.getByLabel("Filter on"), { label: "Type" });
  await choose(page.getByLabel("Filter value"), { label: "Person" });
  await page.getByRole("button", { name: "Add filter" }).click();
  await expect(page.getByText("No contacts match.")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Filters" })
    .getByRole("link", { name: /Type: Person/ })
    .click();
  await expect(row).toBeVisible();

  // The columns chosen, and the cards.
  await page.getByText("Choose the columns").click();
  await page.getByRole("checkbox", { name: "Linked" }).check();
  await expect(page.getByRole("columnheader", { name: "Linked" })).toBeVisible();
  await page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "Cards" }).click();
  await expect(page).toHaveURL(/view=cards/);
  const item = page.getByRole("listitem").filter({ hasText: name });
  await expect(item).toContainText("1 linked");
});

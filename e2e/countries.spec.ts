import { expect, test } from "./fixtures";
import {
  expectChosen,
  expectToast,
  fillMandatory,
  login,
  open,
  pickCity,
  submit,
  tag,
} from "./helpers";

test("the countries and their cities come from Settings: a contact picks its country's city, and a city typed wrong is merged", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // Every ISO country is a row; one is found and its words edited.
  await open(page, "/settings/countries?q=Cameroon");
  const cameroon = page.getByRole("row").filter({ hasText: "Cameroon" });
  await expect(cameroon).toContainText("+237");
  await cameroon.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Dial code").fill("999");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Save" }));
  await expect(page.getByText("A dial code like +32, or nothing")).toBeVisible();
  await page.getByRole("dialog").getByLabel("Dial code").fill("+237");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Save" }));
  await expectToast(page, "Saved");

  // A country's cities, found by another name without accents; a village the list lacks is added.
  await open(page, "/settings/countries/BE?q=bruxelles");
  await expect(page.getByRole("cell", { name: "Brussels", exact: true })).toBeVisible();
  const village = `Testdorp ${t}`;
  await open(page, "/settings/countries/BE");
  await page.getByRole("button", { name: "Add a city" }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill(village);
  await page.getByRole("dialog").getByLabel("Other names").fill(`Dorp${t}`);
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Add" }));
  await expectToast(page, `Added · ${village}`);

  // A contact in Cameroon with no language chosen is written to in French; its city is Douala's.
  const douala = `E2E Douala ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(douala);
  await page.getByLabel("Country", { exact: true }).fill("CM");
  await page.getByRole("option").first().click();
  await pickCity(page, "douala");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: douala })).toBeVisible();
  await expectChosen(page.locator("#lang"), "fr");
  await open(page, `/contacts?q=${encodeURIComponent(douala)}`);
  await expect(page.getByRole("row").filter({ hasText: douala })).toContainText("Douala, Cameroon");

  // The city field offers only the chosen country's cities: Douala is not in Belgium.
  await open(page, "/contacts/new");
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  const city = page.getByRole("combobox", { name: "City" });
  await city.click();
  await city.fill("Douala");
  await expect(page.getByText("No city of this country matches")).toBeVisible();
  await page.keyboard.press("Escape");

  // A Belgian contact on the village; the village merged into Brussels moves the contact.
  const villager = `E2E Villager ${t}`;
  await page.getByLabel("Name", { exact: true }).fill(villager);
  await pickCity(page, `Dorp${t}`);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: villager })).toBeVisible();
  await open(page, `/settings/countries/BE?q=${encodeURIComponent(village)}&check=1`);
  const row = page.getByRole("row").filter({ hasText: village });
  await row.getByRole("button", { name: "Merge into…" }).click();
  await pickCity(page, "Brussels", page.getByRole("dialog"));
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Merge" }));
  await expectToast(page, "Merged — its contacts moved");
  await open(page, `/contacts?q=${encodeURIComponent(villager)}`);
  await expect(page.getByRole("row").filter({ hasText: villager })).toContainText(
    "Brussels, Belgium",
  );
});

test("a Belgian postcode typed fills its city in, and one the post does not know is refused", async ({
  page,
}) => {
  const name = `E2E Postcode ${tag()}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await page.getByLabel("Postcode").fill("2600");
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue(/^Berchem/);
  await page.getByLabel("Postcode").fill("9999");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(
    page.getByText("Not a postcode of this country — pick one from the list."),
  ).toBeVisible();
  await page.getByLabel("Postcode").fill("2600");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("a city picked fills its one postcode, offers several, and a new country clears both", async ({
  page,
}) => {
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Kraainem");
  await expect(page.getByLabel("Postcode")).toHaveValue("1950");
  // Antwerp has several codes: none is chosen for the person, they are offered.
  await pickCity(page, "Antwerp");
  await expect(page.getByLabel("Postcode")).toHaveValue("");
  await expect(page.locator("datalist option")).not.toHaveCount(0);
  await page.getByLabel("Postcode").fill("2000");
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue(/^Antwerp/);
  // Another country: the city and the postcode start over.
  await page.getByLabel("Country", { exact: true }).fill("NL");
  await page.getByRole("option").first().click();
  await expect(page.getByLabel("Postcode")).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue("");
});

test("on a saved contact, a postcode changed replaces the city, and a city changed replaces the postcode", async ({
  page,
}) => {
  const name = `E2E Moved ${tag()}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Country", { exact: true }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Kraainem");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  // The saved address loads as saved; passing through the city changes nothing.
  await expect(page.getByLabel("Postcode")).toHaveValue("1950");
  await page.getByRole("combobox", { name: "City" }).focus();
  await page.getByLabel("Postcode").focus();
  await expect(page.getByLabel("Postcode")).toHaveValue("1950");
  // A postcode changed: the city follows, even though one was there.
  await page.getByLabel("Postcode").fill("1780");
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue(/^Wemmel/);
  // A city changed: its only postcode replaces the one there.
  await pickCity(page, "Kraainem");
  await expect(page.getByLabel("Postcode")).toHaveValue("1950");
});

import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the countries come from Settings: one added, named in the list, and the language follows the country", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // The legacy table, and a country added (a code the contact form then accepts by name).
  await open(page, "/settings/countries");
  const box = page.getByLabel("Countries, one per line");
  const lines = await box.inputValue();
  expect(lines).toContain("BE | Belgium | +32 | fr");
  if (!lines.includes("XK |")) {
    await box.fill(`${lines}\nXK | Kosovo | +383 | en`);
    await submit(page, page.getByRole("button", { name: "Save countries" }));
    await expectToast(page, /Saved · \d+ countries/);
  }

  // A contact in Cameroon with no language chosen is written to in French (legacy langOf).
  const douala = `E2E Douala ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(douala);
  await page.getByLabel("Country (ISO-2)").fill("CM");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: douala })).toBeVisible();
  await expect(page.locator("#lang")).toHaveValue("fr");

  // The list names the country.
  const pristina = `E2E Pristina ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(pristina);
  await page.getByLabel("City").fill("Pristina");
  await page.getByLabel("Country (ISO-2)").fill("XK");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: pristina })).toBeVisible();
  await open(page, `/contacts?q=${encodeURIComponent(pristina)}`);
  await expect(page.getByRole("row").filter({ hasText: pristina })).toContainText(
    "Pristina, Kosovo",
  );
});

import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag, uniqueVat } from "./helpers";

test("a contact's numbers carry the day they were checked, its tags are searched, and its tasks have a tab", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Checks ${t}`;
  await login(page);

  // The formats are a Settings table.
  await open(page, "/settings/id-formats");
  await expect(page.getByText(/19 entries/)).toBeVisible();

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByLabel("VAT number").fill(uniqueVat("BE"));
  await page.getByLabel("Tags").fill(`B2B, Key account ${t}`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(`Key account ${t}`, { exact: true })).toBeVisible();

  // Checked today; a new number is unchecked again.
  await expect(page.getByText("never checked against the register")).toBeVisible();
  await submit(page, page.getByRole("button", { name: "VAT number checked today" }));
  await expectToast(page, /VAT number checked/);
  await expect(page.getByText(/checked against the register on \d{4}-\d{2}-\d{2}/)).toBeVisible();
  await page.getByLabel("VAT number").fill(uniqueVat("BE"));
  await submit(page, page.getByRole("button", { name: "Save", exact: true }));
  await expectToast(page, "Saved");
  await open(page, page.url());
  await expect(page.getByText("never checked against the register")).toBeVisible();

  // Found by a tag; the Tasks tab is there.
  await open(page, `/contacts?q=${encodeURIComponent(`Key account ${t}`)}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
  await page.getByRole("link", { name }).click();
  await page
    .getByRole("navigation", { name: "Section" })
    .getByRole("link", { name: "Tasks" })
    .click();
  await expect(page.getByText("No tasks here.")).toBeVisible();
});

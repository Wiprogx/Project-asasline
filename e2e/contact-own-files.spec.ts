import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, submit, tag } from "./helpers";

test("a contract is kept on the contact itself, opened, and taken off with a reason", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Own Files ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = page.url();

  await open(page, `${url}/documents`);
  await choose(page.getByLabel("Kind of paper"), "Contract");
  await page.getByLabel("Note").fill("Signed in February");
  // Several at once, each on its own: one kept, one refused in the browser before it is sent.
  await page.getByLabel("Add files").setInputFiles([
    {
      name: `contract-${t}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 contract"),
    },
    { name: `virus-${t}.exe`, mimeType: "application/octet-stream", buffer: Buffer.from("MZ") },
  ]);
  await expectToast(page, `Kept — contract-${t}.pdf`);
  await expect(
    page.getByText(`"virus-${t}.exe": not a file the office keeps`).first(),
  ).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: `contract-${t}.pdf` });
  await expect(row).toContainText("Contract");
  await expect(row).toContainText("The contact");
  const href = await row
    .getByRole("button", { name: `Download contract-${t}.pdf` })
    .getAttribute("href");

  // The full-screen viewer draws the PDF, and closes on Escape.
  await row.getByRole("button", { name: `contract-${t}.pdf`, exact: true }).click();
  const viewer = page.getByRole("dialog", { name: `contract-${t}.pdf` });
  await expect(viewer.getByRole("button", { name: "Rotate right" })).toBeVisible();
  await viewer.getByRole("button", { name: "Zoom in" }).click();
  await expect(viewer.getByRole("button", { name: /Zoom 125%/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe("%PDF-1.4 contract");

  await row.getByRole("button", { name: "Remove" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Replaced by the new contract");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Take it off" }));
  await expectToast(page, "Taken off the contact");
  await expect(page.getByRole("row").filter({ hasText: `contract-${t}.pdf` })).toHaveCount(0);
});

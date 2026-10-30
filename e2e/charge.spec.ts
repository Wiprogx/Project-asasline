import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, submit, tag } from "./helpers";

test("a charge raised from the booking lands on its quotation, priced from the catalogue, once or per container", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Charge ${t}`;
  const item = `Scanner move ${t}`;
  await login(page);

  // A charge item in the catalogue (Other services).
  await open(page, "/settings/catalogue");
  await choose(page.getByLabel("Category"), { label: "Other services" });
  await page.getByRole("textbox", { name: "Name" }).fill(item);
  await page.getByLabel("Sell (EUR)").fill("85");
  await page.getByLabel("Buy (EUR)").fill("60");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/quotations/new");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const quotationUrl = page.url();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  // Raised from the booking: the catalogue's price comes with the item, the reason with it.
  await choose(page.getByLabel("Charge", { exact: true }), { label: item });
  await expect(page.getByLabel("Sell (EUR, each)")).toHaveValue("85.00");
  await page.getByLabel("Reason — shown in the history").fill(`Customs pulled the box ${t}`);
  await submit(page, page.getByRole("button", { name: "Add to the quotation" }));
  await expectToast(page, `Added to the quotation: ${item} ×1 — €85.00`);

  // On the quotation's destination, and in both histories.
  await open(page, quotationUrl);
  await expect(page.getByRole("cell", { name: item })).toBeVisible();
  await open(page, `${quotationUrl}/history`);
  await expect(page.getByText(new RegExp(`Charge raised from ${ref}`))).toBeVisible();
});

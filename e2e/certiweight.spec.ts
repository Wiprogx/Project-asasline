import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("Certiweight is switched on from the booking onto its quotation, and cancelled with a reason", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Certi ${t}`;
  await login(page);

  // A Certiweight item in the catalogue, in case the office has none.
  await open(page, "/settings/catalogue");
  await page.getByLabel("Category").selectOption({ label: "Other services" });
  await page.getByRole("textbox", { name: "Name" }).fill(`Certiweight weighing ${t}`);
  await page.getByLabel("Sell (EUR)").fill("120");
  await page.getByLabel("Buy (EUR)").fill("60");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const quotationUrl = page.url();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const bookingUrl = page.url();

  const card = page
    .locator("[data-slot=card]")
    .filter({ hasText: "Certiweight" })
    .filter({
      has: page.getByText("Not sold on this shipment"),
    });
  await expect(card).toBeVisible();
  await submit(page, card.getByRole("button", { name: "Switch Certiweight on" }));
  await expectToast(page, /Certiweight on — .* per container, added to QT/);
  await expect(page.getByText("Sold — the certificate is expected")).toBeVisible();

  // On the quotation, as a line.
  await open(page, quotationUrl);
  await expect(page.getByRole("cell", { name: /certiweight/i }).first()).toBeVisible();

  // Cancelled before any certificate: the reason is required, the line comes off.
  await open(page, bookingUrl);
  await page.getByLabel("Why — it goes in the history").fill(`Customer declined ${t}`);
  await submit(page, page.getByRole("button", { name: "Cancel Certiweight" }));
  await expectToast(page, "Certiweight cancelled on the booking and the quotation");
  await expect(page.getByText("Not sold on this shipment")).toBeVisible();
});

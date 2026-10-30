import { expect, test } from "./fixtures";
import {
  choose,
  expectToast,
  fillMandatory,
  login,
  newItem,
  newQuotation,
  open,
  submit,
  tag,
} from "./helpers";

test("Certiweight is switched on from the booking onto its quotation, and cancelled with a reason", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Certi ${t}`;
  await login(page);

  // A Certiweight item in the catalogue, in case the office has none.
  await newItem(page);
  await choose(page.getByLabel("Category"), { label: "Other services" });
  await page.getByRole("textbox", { name: "Name" }).fill(`Certiweight weighing ${t}`);
  await page.getByLabel("Sell price (€)").fill("120");
  await page.getByLabel("Buy price / cost (€)").fill("60");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, "Added to the catalogue");

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await newQuotation(page, { client: client, pol: "BEANR", pod: "TRMER", sell: "900" });
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

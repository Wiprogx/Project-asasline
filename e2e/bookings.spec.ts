import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

/**
 * The booking journey end to end: a contact, a booking with a server-issued SB number, the
 * details editor (parties by id, the ETA guard, clearing a field), containers (ISO 6346,
 * VGM, removal with a reason), cancel and put back, and the history that records all of it.
 */
test("a booking from creation to history", async ({ page }) => {
  const t = tag();
  const client = `E2E Client ${t}`;
  const consignee = `E2E Consignee ${t}`;
  await login(page);

  for (const name of [client, consignee]) {
    await open(page, "/contacts/new");
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }

  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("2");
  await page.getByRole("button", { name: "Create booking" }).click();
  const ref = page.getByRole("heading", { level: 1 });
  await expect(ref).toHaveText(/^SB\d{4}\d{3,}$/);
  const bookingUrl = page.url();

  // Details: an arrival before the departure is refused, then a valid save lands.
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Consignee").selectOption({ label: consignee });
  await page.getByLabel("Vessel").fill("MSC E2E");
  await page.getByLabel("ETD").fill("2026-11-10");
  await page.getByLabel("ETA").fill("2026-11-01");
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expect(page.getByText("ETA is before ETD")).toBeVisible();
  await page.getByLabel("ETA").fill("2026-12-01");
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");

  // Clearing a field really clears it (the nullMissing fix). Reload first so the form
  // carries the version the first save produced.
  await page.reload();
  await expect(page.getByLabel("Vessel")).toHaveValue("MSC E2E");
  await page.getByLabel("Vessel").fill("");
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");
  await open(page, bookingUrl);
  await expect(page.getByText(consignee)).toBeVisible();
  await expect(page.getByText("MSC E2E")).toHaveCount(0);

  // Containers: a bad check digit is refused, a good number and weights give a VGM.
  await page.getByRole("link", { name: /Containers/ }).click();
  const first = page.getByLabel("Number (ISO 6346)").first();
  await first.fill("CSQU3054384");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expect(page.getByText("Not a valid ISO 6346 number (check digit)")).toBeVisible();
  await first.fill("CSQU3054383");
  await page.getByLabel("Cargo kg").first().fill("20000");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");
  await expect(page.getByText(/VGM 23[.,\s ]?900 kg/).first()).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).last().click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Customer reduced the order");
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expectToast(page, "Container removed");
  await expect(page.getByRole("link", { name: "Containers (1)" })).toBeVisible();

  // Cancel with a reason from the Settings list, then put back.
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption({ index: 1 });
  await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click();
  await expectToast(page, "Booking cancelled");
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await page.getByRole("button", { name: "Put back" }).click();
  await expectToast(page, "Booking put back");

  await page.getByRole("link", { name: "History" }).click();
  for (const line of [
    "Created",
    "Edited",
    "Container saved",
    "Container removed",
    "Cancelled",
    "Put back",
  ]) {
    await expect(page.getByText(new RegExp(`^${line}`)).first()).toBeVisible();
  }
});

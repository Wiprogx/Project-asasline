import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the statuses are shown with their counts and next numbers; document types and rate sources are Settings tables", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // The statuses, fixed, with how many records sit in each and the next numbers of the month.
  await open(page, "/settings/statuses");
  await expect(page.getByText("Booking confirmation")).toBeVisible();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await expect(page.getByText(/Next numbers:/)).toContainText(/QT\d{7}/);
  await expect(page.getByText(/Next numbers:/)).toContainText(/SB\d{7}/);

  // A document type added in Settings › Lists is offered on the booking.
  const docType = `HOUSE BL ${t.slice(-4).toUpperCase()}`;
  await open(page, "/settings/lists");
  const box = page.getByLabel("Document types, one per line");
  const before = await box.inputValue();
  expect(before).toContain("SEA WAYBILL");
  await box.fill(`${before}\n${docType}`);
  await submit(page, box.locator("xpath=ancestor::form").getByRole("button", { name: "Save" }));
  await expectToast(page, /Saved/);

  const client = `E2E Statuses ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const bookingUrl = page.url();
  await open(page, `${bookingUrl}/edit`);
  await page.getByLabel("Transport document").selectOption(docType);
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");
  await open(page, bookingUrl);
  await expect(page.getByText(docType)).toBeVisible();

  // A rate source added in Settings is offered on the catalogue's items.
  await open(page, "/settings/rate-sources");
  const sources = page.getByLabel("Rate sources, one per line");
  const had = await sources.inputValue();
  expect(had).toContain("contract | Contract");
  if (!had.includes("tender |")) {
    await sources.fill(`${had}\ntender | Tender`);
    await submit(page, page.getByRole("button", { name: "Save rate sources" }));
    await expectToast(page, /Saved · \d+ rate sources/);
  }
  await open(page, "/settings/catalogue");
  await expect(
    page.getByLabel("Rate", { exact: true }).locator("option", { hasText: "Tender" }),
  ).toHaveCount(1);
});

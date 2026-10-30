import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, optionsOf, submit, tag } from "./helpers";

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

  // A document type added in Settings › Lists (its own table) is offered on the booking.
  const docType = `HOUSE BL ${t.slice(-4).toUpperCase()}`;
  await open(page, "/settings/lists/doc-types");
  await expect(page.getByRole("row", { name: /SEA WAYBILL/ })).toContainText("Used by the app");
  await page.getByLabel("Document type").fill(docType);
  await page.getByLabel("Its originals travel on paper").check();
  await submit(page, page.getByRole("button", { name: "Add document type" }));
  await expectToast(page, `Added · ${docType}`);
  await expect(page.getByRole("row", { name: new RegExp(docType) })).toContainText("On paper");

  const client = `E2E Statuses ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const bookingUrl = page.url();
  await open(page, `${bookingUrl}/edit`);
  await choose(page.getByLabel("Transport document"), docType);
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
    (await optionsOf(page.getByLabel("Rate", { exact: true }))).filter({ hasText: "Tender" }),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
});

import { expect, test } from "./fixtures";
import { ADMIN, login, open, tag } from "./helpers";

test("time at work is counted per app and kept as visits on the records", async ({ page }) => {
  const t = tag();
  await login(page);

  // A booking to visit.
  const client = `E2E Time ${t}`;
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
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const id = page.url().split("/bookings/")[1];

  // The browser's report, as the beacon sends it: ninety seconds on the booking's documents.
  const res = await page.request.post("/api/time", {
    data: { path: `/bookings/${id}/documents`, seconds: 90 },
  });
  expect(res.status()).toBe(204);
  const bad = await page.request.post("/api/time", { data: { path: "/bookings", seconds: 0 } });
  expect(bad.status()).toBe(400);

  // Settings › Time: the day, per person and app.
  await open(page, "/settings/time");
  const row = page
    .getByRole("row")
    .filter({ hasText: /^Admin/ })
    .first();
  await expect(row).toBeVisible();
  const cells = await row.getByRole("cell").allTextContents();
  // Bookings is the fourth app column: Activity, Quotations, Bookings…
  expect(cells[3]).toMatch(/^\d+m$|^\d+h/);

  // The person's own log carries the visit on the record.
  await open(page, "/settings/people");
  await page
    .getByRole("row")
    .filter({ hasText: ADMIN.email })
    .getByRole("link", { name: /What they did/ })
    .click();
  await expect(page).toHaveURL(/\/settings\/people\/[0-9a-f-]+\/log/);
  await expect(page.getByRole("heading", { level: 2, name: /What .* did/ })).toBeVisible();
  const visit = page.getByRole("listitem").filter({ hasText: ref });
  await expect(visit).toBeVisible();
  await expect(visit).toContainText(/\d+m/);
});

import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("each box has its own loading, and the trucker copy says what a box still lacks", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // Settings offers the legacy table of modes.
  await open(page, "/settings/loading");
  await expect(page.getByText(/12 entries/)).toBeVisible();

  // A booking with two boxes.
  const client = `E2E Loading ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("2");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];
  await expect(
    page
      .getByText("missing: loading address, loading date, loading mode, container number")
      .first(),
  ).toBeVisible();

  // Box 1 is dropped on site, with a stop on the way; box 2 is left untouched.
  await open(page, `/bookings/${id}/containers`);
  await page.locator("#c0-number").fill("MSCU1234566");
  await page.locator("#c0-load-address").fill(`Quay 730, Antwerp ${t}`);
  await page.locator("#c0-load-date").fill("2026-10-20");
  await page.locator("#c0-load-time").fill("07:30");
  await page.locator("#c0-mode").selectOption("Drop off container on ground");
  await expect(page.getByText(/Box left on site/).first()).toBeVisible();
  await page.locator("#c0-pick-date").fill("2026-10-22");
  await page.locator("#c0-stops").fill("Depot Zeebrugge | 2026-10-21 | 09:00");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");

  // The driver of box 1 has everything; the copy of box 2 says what is missing.
  await page.goto(`/print/bookings/${id}/trucker?box=1`);
  await expect(page.getByText(`Quay 730, Antwerp ${t}`)).toBeVisible();
  await expect(page.getByText("Drop off container on ground")).toBeVisible();
  await expect(page.getByText("Depot Zeebrugge · 2026-10-21 09:00")).toBeVisible();
  await expect(page.getByText("2026-10-22")).toBeVisible();
  await expect(page.getByText(/Not ready to go out/)).toHaveCount(0);
  await page.goto(`/print/bookings/${id}/trucker?box=2`);
  await expect(
    page.getByText(
      "Not ready to go out — missing: loading address, loading date, loading mode, container number.",
    ),
  ).toBeVisible();
});

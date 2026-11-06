import { expect, test } from "./fixtures";
import {
  choose,
  expectChosen,
  expectToast,
  fillMandatory,
  login,
  open,
  submit,
  tag,
} from "./helpers";

test("each box has its own loading, and the trucker copy says what a box still lacks", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // Settings offers the legacy table of modes as a list, one row each.
  await open(page, "/settings/loading");
  await expect(page.getByText(/12 modes/)).toBeVisible();
  await expectChosen(page.getByLabel("Mode 11 kind"), "drop");
  await expect(page.getByLabel("Mode 11 name")).toHaveValue("Drop off container on ground");

  // A booking with two boxes.
  const client = `E2E Loading ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await choose(page.getByLabel("Customer"), { label: client });
  // The customer's own address is proposed once its places arrive; the boxes start from it.
  await expect(page.locator("#loadAddressId")).toHaveValue(new RegExp(`^${client}`));
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("2");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];
  await expect(
    page.getByText("missing: loading date, loading mode, container number").first(),
  ).toBeVisible();

  // Box 1 is dropped on site, with a stop on the way (a place of the customer); box 2 is left untouched.
  await open(page, `/bookings/${id}/containers`);
  await page.locator("#c0-number").fill("MSCU1234566");
  // The loading address is a place: the booking's — the customer's own — is proposed.
  await expect(page.locator("#c0-load-address")).toHaveValue(new RegExp(`^${client}`));
  await page.locator("#c0-load").fill("2026-10-20T07:30");
  await choose(page.locator("#c0-mode"), "Drop off container on ground");
  await expect(page.getByText(/Box left on site/).first()).toBeVisible();
  // A drop mode asks when the box is delivered and when it is picked back, never the CMR's end.
  await expect(page.locator("#c0-pickBack")).toBeVisible();
  await expect(page.locator("#c0-loadEnd")).toHaveCount(0);
  await page.locator("#c0-pickBack").fill("2026-10-22T10:00");
  await page.getByRole("button", { name: "+ Add stop" }).first().click();
  await page.locator("#c0-stop-0").fill(client);
  await page.getByRole("listbox").getByRole("option").first().click();
  await page.locator("#c0-stop-0-when").fill("2026-10-21T09:00");
  // The stop has a loading mode of its own; a drop mode asks when the box is picked back there.
  await choose(page.locator("#c0-stop-0-mode"), "Disconnect chassis");
  await page.locator("#c0-stop-0-pickBack").fill("2026-10-23T10:00");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");

  // The driver of box 1 has everything; the copy of box 2 says what is missing.
  await page.goto(`/print/bookings/${id}/trucker?box=1`);
  // The loading address is the customer's place on lines of its own — name, street, city;
  // the stop is the same place in one phrase, written from the contact.
  await expect(page.locator("dd", { hasText: new RegExp(`^${client}\\s+Kaai 1`) })).toHaveCount(1);
  await expect(page.getByText(`${client}, Kaai 1`)).toHaveCount(1);
  await expect(page.getByText("Terminal", { exact: true })).toBeVisible();
  await expect(page.getByText("Drop off container on ground")).toBeVisible();
  // A drop mode: the box is delivered, and picked back.
  await expect(page.getByText("Delivered on", { exact: true })).toBeVisible();
  await expect(page.getByText("Picked back on", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Kaai 1.*· 2026-10-21 09:00 · Disconnect chassis · picked back 2026-10-23 10:00$/,
    ),
  ).toBeVisible();
  await expect(page.getByText("2026-10-22")).toBeVisible();
  await expect(page.getByText(/Not ready to go out/)).toHaveCount(0);
  await page.goto(`/print/bookings/${id}/trucker?box=2`);
  await expect(
    page.getByText("Not ready to go out — missing: loading date, loading mode, container number."),
  ).toBeVisible();
});

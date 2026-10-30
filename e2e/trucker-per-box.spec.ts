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

test("each box's trucker copy goes to its own trucker, naming only its container; a box not ready gets none", async ({
  page,
}) => {
  const t = tag();
  const trucker = `E2E Trucker ${t}`;
  const client = `E2E Per Box ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(trucker);
  await page.getByLabel("WhatsApp").fill("+32470111222");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: trucker })).toBeVisible();
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/bookings/new");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("2");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];

  // Box 1 is agreed with its own trucker; box 2 is not.
  await open(page, `/bookings/${id}/containers`);
  await page.locator("#c0-number").fill("MSCU1234566");
  await page.locator("#c0-load-address").fill(`Quay 730, Antwerp ${t}`);
  await page.locator("#c0-load-date").fill("2026-10-20");
  await page.locator("#c0-load-time").fill("07:30");
  await choose(page.locator("#c0-mode"), "Drop off container on ground");
  await choose(page.locator("#c0-trucker"), { label: trucker });
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");

  await open(page, `/bookings/${id}`);
  await expect(page.getByRole("link", { name: "Send to the trucker — box 2" })).toHaveCount(0);
  await page.getByRole("link", { name: "Send to the trucker — box 1" }).click();
  await expectChosen(page.getByLabel("Template"), "DRIVER_COPY");
  await expect(page.getByLabel("WhatsApp number")).toHaveValue("+32470111222");
  const body = page.getByLabel("Message", { exact: true });
  await expect(body).toHaveValue(/MSCU1234566 \(box 1\)/);
  await expect(body).toHaveValue(new RegExp(`Quay 730, Antwerp ${t}`));
});

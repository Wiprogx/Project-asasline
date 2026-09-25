import { expect, test } from "./fixtures";
import { login, open, tag } from "./helpers";

test("the customer copy carries the price and the trucker copy does not", async ({ page }) => {
  const t = tag();
  const client = `E2E Copies Client ${t}`;
  await page.addInitScript(() => {
    window.print = () => undefined;
  });
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("1900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const base = page.url();

  await expect(page.getByRole("link", { name: "Customer copy (with price)" })).toBeVisible();
  await open(page, base.replace("/bookings/", "/print/bookings/") + "/customer");
  await expect(page.getByRole("heading", { name: "Booking confirmation" }).first()).toBeVisible();
  await expect(page.getByText(client)).toBeVisible();
  await expect(page.getByText("Ocean freight to Mersin")).toBeVisible();
  await expect(page.getByText("€1,900.00").first()).toBeVisible();
  await expect(page.getByText(/article 41/)).toBeVisible();

  await open(page, base.replace("/bookings/", "/print/bookings/") + "/trucker");
  await expect(page.getByRole("heading", { name: "Loading order" }).first()).toBeVisible();
  await expect(page.getByText(ref).first()).toBeVisible();
  await expect(page.getByText("Container — number to follow")).toBeVisible();
  await expect(page.getByText("€1,900.00")).toHaveCount(0);
  await expect(page.getByText("Ocean freight to Mersin")).toHaveCount(0);
});

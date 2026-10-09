import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the goods of a box are weight and packages per HS code, and the VGM follows their total", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // Settings offers the legacy HS table and the package types list.
  await open(page, "/settings/hs-codes");
  await expect(page.getByText(/45 entries/)).toBeVisible();
  await open(page, "/settings/lists");
  await expect(page.getByRole("heading", { name: "Package types" })).toBeVisible();

  // A one-box booking.
  const client = `E2E Goods ${t}`;
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
  const id = page.url().split("/bookings/")[1];

  // Two HS lines: the totals follow as they are typed, and become the box's weight.
  await open(page, `/bookings/${id}/containers`);
  await page.locator("#c0-hs").fill("630900 | 12000 | 620 | Bales\n640399 | 3000 | 40 | Cartons");
  await expect(
    page.getByText("Totals from the lines: 15,000 kg · 660 packages", { exact: false }),
  ).toBeVisible();
  await page.locator("#c0-bl").fill("620 BALES OF WORN CLOTHING\nSAID TO CONTAIN");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");
  // 15,000 kg of cargo plus the 40HC tare from the type (3,900) is the VGM.
  await expect(page.getByText(/VGM 18,900 kg/)).toBeVisible();

  // The papers print the goods per code and the B/L text word for word.
  await page.goto(`/print/bookings/${id}/trucker`);
  await expect(page.getByText("HS 630900")).toBeVisible();
  await expect(
    page.getByText("Worn clothing and other worn articles · 12,000 kg · 620 Bales"),
  ).toBeVisible();
  await expect(page.getByText("660 Bales + Cartons")).toBeVisible();
  await expect(page.getByText("620 BALES OF WORN CLOTHING")).toBeVisible();
});

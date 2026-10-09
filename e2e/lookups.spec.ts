import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the container tables, a contact's professions and a box's owner come from Settings", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // The 45HC tare becomes 5,000 kg in Settings › Containers.
  await open(page, "/settings/containers");
  const specs = page.getByLabel("Container specs, one per line");
  const lines = await specs.inputValue();
  expect(lines).toContain("45HC | 4800 | 32500");
  await specs.fill(lines.replace("45HC | 4800 | 32500", "45HC | 5000 | 32500"));
  await submit(page, page.getByRole("button", { name: "Save container specs" }));
  await expectToast(page, "Saved · 9 container types");
  await open(page, "/settings/lists");
  await expect(page.getByRole("heading", { name: "Professions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Withdraw reasons" })).toBeVisible();

  // A trucker: its professions are kept and shown back.
  const trucker = `E2E Trucker ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(trucker);
  await page.getByLabel("Professions").fill("Transporter, Used clothing");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: trucker })).toBeVisible();
  await expect(page.getByLabel("Professions")).toHaveValue("Transporter, Used clothing");

  // A 45HC numbered by MSC shows its owner, and its VGM reads the tare just saved.
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: trucker });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];
  await open(page, `/bookings/${id}/containers`);
  await page.locator("#c0-number").fill("MSCU1234566");
  await page.locator("#c0-type").selectOption("45HC");
  await page.locator("#c0-cargo").fill("10000");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");
  await expect(page.getByText("MSC", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/VGM 15,000 kg/)).toBeVisible();
});

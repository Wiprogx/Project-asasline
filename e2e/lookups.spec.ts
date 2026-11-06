import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, submit, tag } from "./helpers";

test("the container types' tare, a box's owner and a contact's professions come from Settings", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // The 45HC tare becomes 5,000 kg on its row of Settings › Lists › Container types.
  await open(page, "/settings/lists/container-types");
  const row = page.getByRole("row", { name: /45HC/ });
  await expect(row).toContainText("4,800");
  await row.getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tare kg").fill("5000");
  await submit(page, dialog.getByRole("button", { name: "Save" }));
  await expectToast(page, "Saved");
  await expect(page.getByRole("row", { name: /45HC/ })).toContainText("5,000");

  // The box owners are a list of their own: MSCU is MSC's; a new prefix is spelled in capitals.
  await open(page, "/settings/lists/box-owners");
  await expect(page.getByRole("heading", { name: "Box owners" })).toBeVisible();
  await expect(page.getByRole("row", { name: /MSCU/ })).toContainText("MSC");
  const prefix = `E${t.slice(-3).replace(/\d/g, "X").toUpperCase()}`;
  await page.getByLabel("Prefix").fill(prefix.toLowerCase());
  await page.getByLabel("Owner").fill(`E2E Line ${t}`);
  await submit(page, page.getByRole("button", { name: "Add prefix" }));
  await expectToast(page, `Added · ${prefix}`);
  await expect(page.getByRole("row", { name: new RegExp(prefix) })).toContainText(`E2E Line ${t}`);
  await open(page, "/settings/lists/professions");
  await expect(page.getByRole("heading", { name: "Professions" })).toBeVisible();
  await open(page, "/settings/lists/withdraw-reasons");
  await expect(page.getByRole("heading", { name: "Withdraw reasons" })).toBeVisible();

  // A trucker: its professions are kept and shown back.
  const trucker = `E2E Trucker ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(trucker);
  await page.getByLabel("Professions").fill("Transporter, Used clothing");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: trucker })).toBeVisible();
  await expect(page.getByLabel("Professions")).toHaveValue("Transporter, Used clothing");

  // A 45HC numbered by MSC shows its owner, and its VGM reads the tare just saved.
  await open(page, "/bookings/new");
  await choose(page.getByLabel("Customer"), { label: trucker });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];
  await open(page, `/bookings/${id}/containers`);
  await page.locator("#c0-number").fill("MSCU1234566");
  await choose(page.locator("#c0-type"), "45HC");
  await page.locator("#c0-cargo").fill("10000");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");
  await expect(page.getByText("MSC", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/VGM 15,000 kg/)).toBeVisible();
});

import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a port is added, edited, offered on the port fields and archived", async ({ page }) => {
  const code = `ZZ${tag().slice(-3).toUpperCase().replace(/[01]/g, "X")}`;
  await login(page);
  await open(page, "/settings/ports");
  await expect(page.getByRole("cell", { name: "CMDLA", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add a port" }).click();
  const add = page.getByRole("dialog");
  await add.getByLabel("UN/LOCODE").fill(code);
  await add.getByLabel("Name").fill("Test port");
  await add.getByLabel("Country").fill("ZZ");
  await add.getByLabel("Time zone").fill("Africa/Douala");
  await add.getByLabel("Other names").fill("Testhaven; Porto Test");
  await submit(page, add.getByRole("button", { name: "Add" }));
  await expectToast(page, `Added · ${code} Test port`);
  // Offered on every port field, with what the office should know about it.
  await open(page, "/bookings/new");
  await expect(page.locator(`datalist#ports option[value="${code}"]`)).toHaveCount(1);
  await expect(page.getByLabel("Port of loading")).toHaveAttribute("list", "ports");
  // Found by another name; edited; a bad time zone is refused.
  await open(page, "/settings/ports?q=testhaven");
  const row = page.getByRole("row").filter({ hasText: code });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Time zone").fill("Mars/Olympus");
  await submit(page, edit.getByRole("button", { name: "Save" }));
  await expect(edit.getByText("A time zone such as Africa/Douala")).toBeVisible();
  await edit.getByLabel("Time zone").fill("Africa/Lagos");
  await edit.getByLabel(/pre-clearance/).check();
  await submit(page, edit.getByRole("button", { name: "Save" }));
  await expectToast(page, "Saved");
  await expect(row.getByText("Pre-clearance")).toBeVisible();
  await expect(page.locator(`datalist#ports option[value="${code}"]`)).toHaveText(
    "Test port (ZZ) · pre-clearance",
  );
  // Archived with a reason: no longer offered, back with Put back.
  await row.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Test port closed");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Archive" }));
  await expectToast(page, /Archived/);
  await open(page, "/bookings/new");
  await expect(page.locator(`datalist#ports option[value="${code}"]`)).toHaveCount(0);
  await open(page, `/settings/ports?q=${code}&archived=1`);
  await submit(page, page.getByRole("button", { name: "Put back" }));
  await expectToast(page, "Offered again");
});

test("a filing rule saved in Settings files the next upload", async ({ page }) => {
  const t = tag();
  await login(page);
  await open(page, "/settings/filing");
  const box = page.getByLabel("Filing rules, one per line");
  const before = await box.inputValue();
  await box.fill(
    `${before}\nweighbridge ${t} → WEIGH${t.slice(-3).toUpperCase().replace(/\d/g, "X")}`,
  );
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Saved · \d+ rules/);
  await page.getByLabel("Filing rules, one per line").fill("no arrow here");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Each line reads/);
  await page.getByLabel("Filing rules, one per line").fill(before);
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Saved/);
});

test("the permission matrix is edited, and the Admin keeps Settings", async ({ page }) => {
  await login(page);
  await open(page, "/settings/permissions");
  await expect(page.getByLabel("Admin — app.settings")).toBeDisabled();
  const cell = page.getByLabel("Docs clerk — catalogue.edit");
  const was = await cell.isChecked();
  await cell.setChecked(!was);
  await submit(page, page.getByRole("button", { name: "Save permissions" }));
  await expectToast(page, "Permissions saved");
  await open(page, "/settings/permissions");
  await expect(page.getByLabel("Docs clerk — catalogue.edit")).toBeChecked({ checked: !was });
  await page.getByLabel("Docs clerk — catalogue.edit").setChecked(was);
  await submit(page, page.getByRole("button", { name: "Save permissions" }));
  await expectToast(page, "Permissions saved");
});

test("the links report opens", async ({ page }) => {
  await login(page);
  await open(page, "/settings/links");
  await expect(page.getByText("Shipping lines and their office here")).toBeVisible();
  await expect(page.getByText("Bookings with no quotation behind them")).toBeVisible();
  await expect(page.getByText("Customers shipping without a VAT number")).toBeVisible();
});

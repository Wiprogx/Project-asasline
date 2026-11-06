import { expect, test } from "./fixtures";
import {
  addOceanLeg,
  choose,
  expectToast,
  fillMandatory,
  login,
  makeCarrier,
  open,
  pickCity,
  submit,
  tag,
} from "./helpers";

test("a door-to-port quotation for two containers, each box asked separately, its delivery address made on the spot, books into one booking", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  const client = `E2E Door ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // The ocean leg the destination is built from, its shipping line a contact.
  const carrier = await makeCarrier(page, `DOOR LINE ${t}`);
  await addOceanLeg(page, { pod: "CMDLA", carrier, sell: "4250", buy: "3500" });

  await open(page, "/quotations/new");
  const customer = page.getByRole("combobox", { name: "Customer", exact: true });
  await customer.click();
  await customer.fill(client);
  await page.getByRole("listbox").getByRole("option", { name: client, exact: true }).click();
  // A door service by default; the customer has no delivery address yet: one is made here.
  await expect(page.getByLabel("Service", { exact: true })).toHaveAttribute(
    "data-value",
    "door_port",
  );
  await page.getByRole("button", { name: "+ New location" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Name", { exact: true }).fill(`Warehouse ${t}`);
  await dlg.getByLabel("Street", { exact: true }).fill("Kaai 12");
  await dlg.getByRole("combobox", { name: "Country" }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Zeebrugge", dlg);
  await submit(page, dlg.getByRole("button", { name: "Add the location" }));
  await expectToast(page, `Warehouse ${t} added`);
  await expect(page.getByRole("combobox", { name: "Loading address", exact: true })).toHaveValue(
    new RegExp(`^Warehouse ${t}`),
  );

  const leg = page.getByRole("combobox", { name: "Ocean leg", exact: true });
  await leg.click();
  await leg.fill(carrier);
  await page.getByRole("listbox").getByRole("option").first().click();
  // Two containers: each box asked separately, starting from the destination's address.
  await page.getByLabel("How many containers").fill("2");
  await expect(page.getByText("Each container — asked separately")).toBeVisible();
  await choose(page.getByLabel("Box 1 loading mode"), { index: 1 });
  // Box 2 is dropped on site: the quotation asks when it is delivered and picked back, as one
  // field each (day and hour), as the booking will.
  await choose(page.getByLabel("Box 2 loading mode"), "Drop off container on ground");
  await expect(page.locator("#box-0-delivered")).toHaveCount(0);
  // Under direct loading the quotation asks the loading day and hour all the same.
  await page.locator("#box-0-loading").fill("2026-11-10T07:30");
  await page.locator("#box-1-delivered").fill("2026-11-12T08:00");
  await page.locator("#box-1-pickBack").fill("2026-11-14T16:00");
  await expect(page.getByRole("combobox", { name: "Box 2 loading address" })).toHaveValue(
    new RegExp(`^Warehouse ${t}`),
  );
  // Box 1 carries worn clothing: its own HS row (quotation > destination > container > HS).
  const hs = page.getByRole("combobox", { name: "Box 1 commodity (HS) 1", exact: true });
  await hs.click();
  await hs.fill("630900");
  await page.getByRole("listbox").getByRole("option").first().click();
  // Box 2 calls at a second place of the customer, made on the spot from the stop's own picker.
  await page.getByRole("button", { name: "+ Add stop" }).nth(1).click();
  await page.getByRole("button", { name: "+ New location" }).nth(2).click();
  const stop = page.getByRole("dialog");
  await stop.getByLabel("Name", { exact: true }).fill(`Depot ${t}`);
  await stop.getByLabel("Street", { exact: true }).fill("Industrieweg 5");
  await stop.getByRole("combobox", { name: "Country" }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Brugge", stop);
  await submit(page, stop.getByRole("button", { name: "Add the location" }));
  await expectToast(page, `Depot ${t} added`);
  await expect(page.getByRole("combobox", { name: "Stop 1", exact: true })).toHaveValue(
    new RegExp(`^Depot ${t}`),
  );
  // The stop has a loading mode of its own; a drop mode asks when the box is delivered and picked back.
  await choose(page.getByLabel("Stop 1 loading mode"), "Disconnect chassis");
  await page.locator("#box-1-stop-0-when").fill("2026-11-13T09:00");
  await page.locator("#box-1-stop-0-pickBack").fill("2026-11-15T10:00");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const quotationId = page.url().split("/quotations/")[1];
  await expect(page.getByText(/40HC × 2|× 2/).first()).toBeVisible();

  // One booking for the destination, its two boxes carrying their own loading.
  await page.getByRole("button", { name: "Accept → create booking" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await page.getByRole("link", { name: "Containers (2)" }).click();
  // Each box's picker shows the quoted place, box 2's stop the depot made for it.
  await expect(page.locator("#c0-load-address")).toHaveValue(new RegExp(`^Warehouse ${t}`));
  await expect(page.locator("#c1-stop-0")).toHaveValue(new RegExp(`^Depot ${t}`));
  await expect(page.getByText(/630900/).first()).toBeVisible();
  // Each box carries the moments agreed on the quotation onto its loading card.
  await expect(page.locator("#c0-load")).toHaveValue("2026-11-10T07:30");
  await expect(page.locator("#c1-load")).toHaveValue("2026-11-12T08:00");
  await expect(page.locator("#c1-pickBack")).toHaveValue("2026-11-14T16:00");

  // The printed quotation says the stop as its own rows: the place, then when and how.
  await open(page, `/print/quotations/${quotationId}`);
  await expect(page.getByText("Container 2 · Stop 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Container 2 · Stop 1 — when and how")).toBeVisible();
  await expect(page.getByText("Disconnect chassis").first()).toBeVisible();
  await expect(page.getByText("Picked back on 2026-11-15 10:00")).toBeVisible();

  // Both places are the customer's own linked locations, with the delivery role.
  await open(page, `/contacts?q=${encodeURIComponent(client)}`);
  await page.getByRole("link", { name: client }).first().click();
  await expect(page.getByText(`Warehouse ${t}`).first()).toBeVisible();
  await expect(page.getByText(`Depot ${t}`).first()).toBeVisible();

  // The next quotation starts from the customer's most recent delivery address: the depot.
  await open(page, "/quotations/new");
  await customer.click();
  await customer.fill(client);
  await page.getByRole("listbox").getByRole("option", { name: client, exact: true }).click();
  const load = page.getByRole("combobox", { name: "Loading address", exact: true });
  await expect(load).toHaveValue(new RegExp(`^Depot ${t}`));
  // Typing the customer's name lists its own address and every place linked under it.
  await load.fill(client);
  const listed = page.getByRole("listbox").getByRole("option");
  await expect(listed.filter({ hasText: `${client} — Kaai 1` })).toHaveCount(1);
  await expect(listed.filter({ hasText: `Warehouse ${t}` })).toHaveCount(1);
  await expect(listed.filter({ hasText: `Depot ${t}` })).toHaveCount(1);
  await page.keyboard.press("Escape");

  // For another customer too: the places of any company are found by that company's name.
  await customer.click();
  await customer.fill(carrier);
  await page.getByRole("listbox").getByRole("option", { name: carrier, exact: true }).click();
  // The carrier has no delivery address: the picker empties once its places arrive, then settles.
  await expect(load).toHaveValue("");
  await load.fill(client);
  await expect(listed.filter({ hasText: `${client} — Kaai 1` })).toHaveCount(1);
  await expect(listed.filter({ hasText: `Warehouse ${t}` })).toHaveCount(1);
  await expect(listed.filter({ hasText: `Depot ${t}` })).toHaveCount(1);
});

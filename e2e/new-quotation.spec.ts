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
  await choose(page.getByLabel("Box 2 loading mode"), { index: 1 });
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
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  await expect(page.getByText(/40HC × 2|× 2/).first()).toBeVisible();

  // One booking for the destination, its two boxes carrying their own loading.
  await page.getByRole("button", { name: "Accept → create booking" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await page.getByRole("link", { name: "Containers (2)" }).click();
  await expect(page.getByText(`Warehouse ${t}, Kaai 12`).first()).toBeVisible();
  await expect(page.getByText(`Depot ${t}, Industrieweg 5`).first()).toBeVisible();
  await expect(page.getByText(/630900/).first()).toBeVisible();

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
  await expect(page.getByRole("combobox", { name: "Loading address", exact: true })).toHaveValue(
    new RegExp(`^Depot ${t}`),
  );
});

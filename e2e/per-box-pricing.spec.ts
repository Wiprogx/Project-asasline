import { expect, test } from "./fixtures";
import {
  choose,
  expectToast,
  fillMandatory,
  login,
  newQuotation,
  open,
  submit,
  tag,
  takeOutOfCatalogue,
} from "./helpers";

// Its customs, VGM and free-time items would start every later quotation: taken out after each test.
let used = "";
test.afterEach(async ({ page }) => {
  if (used) await takeOutOfCatalogue(page, used);
  used = "";
});

test("a destination quoted for two containers multiplies its per-container lines, counts a box-bound line once, and never totals a free-time term", async ({
  page,
}) => {
  const t = tag();
  used = t;
  await login(page);

  // A free-time item in the catalogue: demurrage at destination, by kind not by name.
  await open(page, "/settings/catalogue");
  await choose(page.getByLabel("Category"), { label: "Free time & charges" });
  await page.getByLabel("Name", { exact: true }).fill(`Container terms ${t}`);
  await page.getByLabel("Free days").fill("14");
  await choose(page.getByLabel("Free time of"), "demurrage");
  await choose(page.getByLabel("At", { exact: true }), "destination");
  await choose(page.getByLabel("Applies to"), "");
  await page.getByLabel("Sell (EUR)").fill("65");
  await page.getByLabel("Buy (EUR)").fill("45");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  const client = `E2E Boxes ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // One destination at 900 per container.
  await newQuotation(page, {
    client: client,
    pol: "BEANR",
    pod: "TRMER",
    sell: "900",
    service: `Ocean freight ${t}`,
  });

  // Two containers: the title says so and the line doubles.
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Containers").fill("2");
  await submit(page, dialog.getByRole("button", { name: "Save destination" }));
  await expectToast(page, "Destination saved");
  await expect(page.getByText(/40HC × 2|× 2/).first()).toBeVisible();
  const card = page.locator("[data-slot=card]").filter({ hasText: `Ocean freight ${t}` });
  await expect(card.getByRole("row").filter({ hasText: `Ocean freight ${t}` })).toContainText(
    "€1,800.00",
  );

  // A box-bound extra counted once; the free-time term the destination started with adds nothing.
  await card.getByLabel("Or a service typed").fill("Extra stop in Mechelen");
  await card.getByLabel("Sell (EUR)").fill("100");
  await card.getByLabel("Per container").uncheck();
  await submit(page, card.getByRole("button", { name: "Add line" }));
  await expectToast(page, "Line added");
  // The free-time term came with the destination, from the catalogue (legacy fillRouteLines).
  await expect(card.getByRole("row").filter({ hasText: "Extra stop in Mechelen" })).toContainText(
    "€100.00",
  );
  await expect(card.getByRole("row").filter({ hasText: `Container terms ${t}` })).toContainText(
    "— terms",
  );
  await expect(card.getByRole("row").filter({ hasText: "Total" })).toContainText("€1,900.00");

  // The booking opens with the two boxes quoted.
  await page.getByRole("button", { name: "Accept → create booking" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await expect(page.getByRole("link", { name: "Containers (2)" })).toBeVisible();
});

import { expect, test } from "./fixtures";
import {
  choose,
  expectToast,
  fillMandatory,
  login,
  newQuotation,
  open,
  optionsOf,
  portTag,
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

test("a destination starts with the direction's customs, VGM and free time, and the letter speaks the customer's language", async ({
  page,
}) => {
  const t = tag();
  used = t;
  const pod = portTag();
  await login(page);

  // The catalogue: an ocean leg, an export customs, a VGM, and a demurrage term.
  await open(page, "/settings/catalogue");
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill(pod);
  await page.getByLabel("Sell (EUR)").fill("2500");
  await page.getByLabel("Buy (EUR)").fill("1800");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");
  for (const [category, name, scope, sell] of [
    ["Customs clearance", `Export customs ${t}`, "export", "300"],
    ["Customs clearance", `Import customs ${t}`, "import", "400"],
    ["VGM / weighing", `VGM ${t}`, "", "120"],
  ] as const) {
    await choose(page.getByLabel("Category"), { label: category });
    await page.getByLabel("Name", { exact: true }).fill(name);
    // The form keeps its last values after a submit, so the scope is set every time.
    await choose(page.getByLabel("Applies to"), scope);
    await page.getByLabel("Sell (EUR)").fill(sell);
    await page.getByLabel("Buy (EUR)").fill("50");
    await submit(page, page.getByRole("button", { name: "Add item" }));
    await expectToast(page, "Added to the catalogue");
  }
  await choose(page.getByLabel("Category"), { label: "Free time & charges" });
  await page.getByLabel("Name", { exact: true }).fill(`Demurrage at destination ${t}`);
  await choose(page.getByLabel("Applies to"), "");
  await page.getByLabel("Free days").fill("14");
  await page.getByLabel("Sell (EUR)").fill("65");
  await page.getByLabel("Buy (EUR)").fill("45");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  // A French-speaking customer.
  const client = `E2E Extras Client ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await choose(page.getByLabel("Language"), "fr");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // An export quotation; the destination from the leg brings a customs line, a VGM and a demurrage term
  // (the first of each the catalogue holds, so by kind, not by name), never an import-only one.
  await newQuotation(page, {
    client: client,
    pol: "BEANR",
    pod: "TRMER",
    sell: "900",
    service: "Ocean freight to Mersin",
    kind: "export",
  });
  await choose(page.getByLabel("Ocean leg"), { label: `BEANR › ${pod}` });
  await submit(page, page.getByRole("button", { name: "Add destination" }));
  await expectToast(page, "Destination added");
  const leg = page.locator("[data-slot=card]").filter({ has: page.getByText(`BEANR → ${pod}`) });
  await expect(
    leg
      .getByRole("row")
      .filter({ hasText: /customs/i })
      .first(),
  ).toBeVisible();
  await expect(leg.getByRole("row").filter({ hasText: /VGM/ }).first()).toBeVisible();
  await expect(
    leg
      .getByRole("row")
      // The first free-time term the catalogue holds, whichever name a parallel run gave it.
      .filter({ hasText: /free days/ })
      .first(),
  ).toBeVisible();
  await expect(leg.getByRole("row").filter({ hasText: `Import customs ${t}` })).toHaveCount(0);

  // The letter is in French.
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Subject")).toHaveValue(/^Offre de prix QT/);
  await page.keyboard.press("Escape");
});

test("the catalogue's categories and their accounts are edited, and a category in use stays", async ({
  page,
}) => {
  await login(page);
  await open(page, "/settings/catalogue");
  const box = page.getByLabel("Categories, one per line");
  const before = await box.inputValue();
  await box.fill(`${before}\nsurvey | Survey & inspection | 700400 | 604500`);
  await submit(page, page.getByRole("button", { name: "Save categories" }));
  await expectToast(page, /Saved · \d+ categories/);
  await expect(
    (await optionsOf(page.getByLabel("Category"))).filter({ hasText: "Survey & inspection" }),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Categories, one per line")
    .fill("survey | Survey & inspection | 700400 | 604500");
  await submit(page, page.getByRole("button", { name: "Save categories" }));
  await expectToast(page, /Items still use/);
  await page.getByLabel("Categories, one per line").fill(before);
  await submit(page, page.getByRole("button", { name: "Save categories" }));
  await expectToast(page, /Saved/);
});

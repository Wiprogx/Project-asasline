import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a destination starts with the direction's customs, VGM and free time, and the letter speaks the customer's language", async ({
  page,
}) => {
  const t = tag();
  const pod = `X${t.slice(-4).toUpperCase()}`;
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
    await page.getByLabel("Category").selectOption({ label: category });
    await page.getByLabel("Name", { exact: true }).fill(name);
    // The form keeps its last values after a submit, so the scope is set every time.
    await page.getByLabel("Applies to").selectOption(scope);
    await page.getByLabel("Sell (EUR)").fill(sell);
    await page.getByLabel("Buy (EUR)").fill("50");
    await submit(page, page.getByRole("button", { name: "Add item" }));
    await expectToast(page, "Added to the catalogue");
  }
  await page.getByLabel("Category").selectOption({ label: "Free time & charges" });
  await page.getByLabel("Name", { exact: true }).fill(`Demurrage at destination ${t}`);
  await page.getByLabel("Applies to").selectOption("");
  await page.getByLabel("Free days").fill("14");
  await page.getByLabel("Sell (EUR)").fill("65");
  await page.getByLabel("Buy (EUR)").fill("45");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  // A French-speaking customer.
  const client = `E2E Extras Client ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Language").selectOption("fr");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // An export quotation; the destination from the leg brings a customs line, a VGM and a demurrage term
  // (the first of each the catalogue holds, so by kind, not by name), never an import-only one.
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Direction").selectOption("export");
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  await page.getByLabel("Ocean leg").selectOption({ label: `BEANR › ${pod}` });
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
    page.getByLabel("Category").locator("option", { hasText: "Survey & inspection" }),
  ).toHaveCount(1);
  await page
    .getByLabel("Categories, one per line")
    .fill("survey | Survey & inspection | 700400 | 604500");
  await submit(page, page.getByRole("button", { name: "Save categories" }));
  await expectToast(page, /Items still use/);
  await page.getByLabel("Categories, one per line").fill(before);
  await submit(page, page.getByRole("button", { name: "Save categories" }));
  await expectToast(page, /Saved/);
});

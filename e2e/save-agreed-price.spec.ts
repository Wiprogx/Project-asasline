import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a price changed on a quotation line is kept in the customer's agreement and offered next time", async ({
  page,
}) => {
  const t = tag();
  const pod = `S${t.slice(-4).toUpperCase()}`;
  const client = `E2E Agreed ${t}`;
  await login(page);

  await open(page, "/settings/catalogue");
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill(pod);
  await page.getByLabel("Sell (EUR)").fill("3000");
  await page.getByLabel("Buy (EUR)").fill("2000");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  const quote = async () => {
    await open(page, "/quotations/new");
    await page.getByLabel("Customer").selectOption({ label: client });
    await page.getByLabel("Port of loading").fill("BEANR");
    await page.getByLabel("Port of discharge").fill("TRMER");
    await page.getByLabel("Service").fill("Ocean freight to Mersin");
    await page.getByLabel("Sell (EUR)").fill("900");
    await page.getByRole("button", { name: "Create quotation" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
    await page.getByLabel("Ocean leg").selectOption({ label: `BEANR › ${pod}` });
    await submit(page, page.getByRole("button", { name: "Add destination" }));
    await expectToast(page, "Destination added");
    return page
      .locator("[data-slot=card]")
      .filter({ has: page.getByText(new RegExp(`BEANR → ${pod}`)) })
      .getByRole("row")
      .filter({ hasText: `BEANR › ${pod}` });
  };

  const first = await quote();
  await expect(first).toContainText("Catalogue");
  await first.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Sell (EUR)").fill("2750");
  await submit(page, page.getByRole("button", { name: "Save line" }));
  await expectToast(page, /price kept in .* agreed prices/);
  await expect(first).toContainText("Agreed");

  // The next quotation for the customer is priced from the agreement.
  const second = await quote();
  await expect(second).toContainText("Agreed");
  await expect(second).toContainText("€2,750.00");
});

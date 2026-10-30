import { expect, test } from "./fixtures";
import {
  addOceanLeg,
  choose,
  expectToast,
  fillMandatory,
  login,
  newQuotation,
  open,
  portTag,
  submit,
  tag,
} from "./helpers";

test("a price changed on a quotation line is kept in the customer's agreement and offered next time", async ({
  page,
}) => {
  // The whole office in one journey: carrier, catalogue, agreement, quotation.
  test.slow();
  const t = tag();
  const pod = portTag();
  const client = `E2E Agreed ${t}`;
  await login(page);

  await addOceanLeg(page, { pod, sell: "3000", buy: "2000" });

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  const quote = async () => {
    await newQuotation(page, {
      client: client,
      pol: "BEANR",
      pod: "TRMER",
      sell: "900",
      service: "Ocean freight to Mersin",
    });
    await choose(page.getByLabel("Ocean leg"), { label: `BEANR › ${pod} · 40HC` });
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

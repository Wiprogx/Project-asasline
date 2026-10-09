import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a step closes on a number recorded, a confirmation or a message sent, as its rule says", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Needs Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("GALBV");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);

  // Gabon's BIETC number closes on the number itself.
  await open(page, `${page.url()}/documents`);
  const bietc = page
    .getByRole("listitem")
    .filter({ has: page.getByText("BIETC_NO", { exact: true }) });
  await bietc.getByRole("button", { name: "Record the number" }).click();
  await page.getByRole("dialog").getByLabel("The number").fill(`BIETC-${t}`);
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Record it" }));
  await expectToast(page, /BIETC_NO checked/);
  await expect(bietc.getByText(`Checked — BIETC-${t}`)).toBeVisible();

  // The invoice request is a message: its close reads "Sent".
  const ask = page
    .getByRole("listitem")
    .filter({ has: page.getByText("ASK_INV", { exact: true }) });
  await expect(ask.getByRole("button", { name: "Sent" })).toBeVisible();

  // The rule editor offers what closes a step.
  await open(page, "/settings/rules");
  await expect(page.getByRole("row").filter({ hasText: "BIETC_NO" }).first()).toBeVisible();
});

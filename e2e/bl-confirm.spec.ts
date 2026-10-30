import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, optionsOf, submit, tag } from "./helpers";

test("the B/L is confirmed as it is, or a correction is written down from WhatsApp or e-mail and sent to the line", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E BL ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const url = page.url();
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  // The chain up to the confirmation: the box's weight, VGM, the SI, the draft and its sending.
  await open(page, `${url}/containers`);
  await page.getByLabel("Cargo kg").first().fill("18000");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, /saved/i);
  await open(page, `${url}/documents`);
  const step = (code: string) =>
    page.getByRole("listitem").filter({ has: page.getByText(code, { exact: true }) });
  for (const [code, button] of [
    ["VGM", "Confirmed"],
    ["SI", "Sent"],
    ["BL_DRAFT", "Checked"],
    ["BL_SEND", "Sent"],
  ] as const) {
    await submit(page, step(code).getByRole("button", { name: button }));
    await expectToast(page, new RegExp(`${code} checked`));
  }

  // A correction: never by phone, and what has to change is written down.
  const bl = step("BL_OK");
  await expect(bl).toContainText("BL_OK Sea Waybill confirmed");
  await bl.getByRole("button", { name: "Confirm the B/L" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("A correction is wanted").check();
  await expect(
    (await optionsOf(d.getByLabel("How it came in"))).filter({ hasText: "Phone call" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await d.getByLabel("What has to change").fill(`Consignee address ${t}`);
  await submit(page, d.getByRole("button", { name: "Record the answer" }));
  await expectToast(page, "Correction recorded — task added");
  await expect(bl.getByText("Sent back").first()).toBeVisible();

  await open(page, `${url}/tasks`);
  await expect(page.getByText(`Send the B/L correction to the line — ${ref}`)).toBeVisible();

  // The corrected draft confirmed by e-mail: the step is done, the copy kept.
  await open(page, `${url}/documents`);
  await bl.getByRole("button", { name: "Confirm the B/L" }).click();
  await d.getByLabel("Confirmed as it is").check();
  await choose(d.getByLabel("How it came in"), "email");
  await submit(page, d.getByRole("button", { name: "Record the answer" }));
  await expectToast(page, "B/L confirmed");
  await expect(bl.getByText(/Checked/).first()).toBeVisible();
});

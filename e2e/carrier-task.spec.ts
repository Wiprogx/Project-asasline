import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the carrier's confirmation closes the task the booking opened to get it", async ({
  page,
}) => {
  const client = `E2E Carrier Task ${tag()}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^SB/);
  const sb = (await heading.innerText()).trim();
  const url = page.url();
  const task = `Confirm booking ${sb} with the carrier`;

  const setStatus = async (value: string) => {
    await page.getByLabel("Status").selectOption(value);
    await submit(page, page.getByRole("button", { name: "Set", exact: true }));
    await expectToast(page, "Status updated");
  };
  await setStatus("sent");
  await open(page, `/activity?q=${encodeURIComponent(sb)}`);
  await expect(page.getByText(task)).toBeVisible();

  await open(page, url);
  await setStatus("confirmed");
  await open(page, `/activity?q=${encodeURIComponent(sb)}`);
  await expect(page.getByText(task)).toHaveCount(0);
  await open(page, `/activity?state=done&q=${encodeURIComponent(sb)}`);
  await expect(page.getByRole("listitem").filter({ hasText: task })).toContainText("done by");
});

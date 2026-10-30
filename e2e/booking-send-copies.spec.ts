import { expect, test } from "./fixtures";
import {
  choose,
  expectChosen,
  expectToast,
  fillMandatory,
  login,
  open,
  submit,
  tag,
} from "./helpers";

test("the booking confirmation goes out from the booking with its template, and its step closes", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Send Copies ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Email").fill(`copies.${t}@example.com`);
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
  const id = page.url().split("/bookings/")[1];

  // The step waits on the documents tab until the confirmation goes out.
  await open(page, `/bookings/${id}/documents`);
  const step = page
    .getByRole("listitem")
    .filter({ has: page.getByText("CONFIRM_OUT", { exact: true }) });
  await expect(step).toBeVisible();

  // "Send the confirmation" opens the message form on the template, already written.
  await open(page, `/bookings/${id}`);
  await page.getByRole("link", { name: "Send the confirmation" }).click();
  await expectChosen(page.getByLabel("Template"), "BK_CONFIRM");
  await expect(page.getByLabel("Subject")).toHaveValue(/^Booking confirmation SB/);
  await choose(page.getByLabel("To a party on the file"), { label: `${client} (Customer, Payer)` });
  await submit(page, page.getByRole("button", { name: "Record and open to send" }));
  await expectToast(page, /CONFIRM_OUT done/);

  await open(page, `/bookings/${id}/documents`);
  await expect(step.getByText("Step done")).toBeVisible();
  // The trucker copy's step is still waiting for its own message.
  await expect(
    page
      .getByRole("listitem")
      .filter({ has: page.getByText("TRUCKER_OUT", { exact: true }) })
      .getByText("Step done"),
  ).toHaveCount(0);
});

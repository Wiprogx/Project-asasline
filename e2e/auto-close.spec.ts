import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a message step closes on the message sent with its template, a tracking step on the milestone ticked", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Auto Close ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Email").fill(`auto.${t}@example.com`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];

  // The invoice request is a message step: open until the message with its template goes out.
  await open(page, `/bookings/${id}/documents`);
  const ask = page
    .getByRole("listitem")
    .filter({ has: page.getByText("ASK_INV", { exact: true }) });
  await expect(ask.getByRole("button", { name: "Sent" })).toBeVisible();
  await open(page, `/bookings/${id}/messages`);
  await page.getByLabel("Template").selectOption({ label: "Ask for the export invoice" });
  await page
    .getByLabel("To a party on the file")
    .selectOption({ label: `${client} (Customer, Payer)` });
  await expect(page.getByLabel("E-mail address")).toHaveValue(`auto.${t}@example.com`);
  await submit(page, page.getByRole("button", { name: "Record and open to send" }));
  await expectToast(page, /ASK_INV done/);
  await open(page, `/bookings/${id}/documents`);
  await expect(ask.getByText("Step done")).toBeVisible();

  // The vessel's departure ticked on the journey closes the SAILED step.
  await open(page, `/bookings/${id}/tracking`);
  const sailed = page.getByRole("listitem").filter({ hasText: "Vessel departure" });
  await submit(page, sailed.getByRole("button", { name: "Confirm" }));
  await expectToast(page, /Journey updated/);
  await open(page, `/bookings/${id}/documents`);
  await expect(
    page
      .getByRole("listitem")
      .filter({ has: page.getByText("SAILED", { exact: true }) })
      .getByText("Step done"),
  ).toBeVisible();
});

import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a quotation, a destination and a booking each open the task their rule asks for", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  await open(page, "/settings/activity-rules");
  await expect(page.getByText(/6 entries/)).toBeVisible();

  const client = `E2E Rules ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // A quotation: "Send quotation QT… to the client", due today, an e-mail.
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill(`Ocean freight ${t}`);
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const qt = await page.getByRole("heading", { level: 1 }).innerText();

  // Another destination: "Quote BEANR › X to the client".
  await page.getByLabel("From", { exact: true }).fill("BEANR");
  await page.getByLabel("To", { exact: true }).fill("CMDLA");
  await submit(page, page.getByRole("button", { name: "Add destination" }));
  await expectToast(page, "Destination added");

  await open(page, `/activity?q=${encodeURIComponent(client)}`); // both tasks name the client
  const sendTask = page.getByText(`Send quotation ${qt} to ${client}`);
  await expect(sendTask).toBeVisible();
  await expect(sendTask.locator("..").locator("..")).toContainText("Email");
  await expect(page.getByText(`Quote BEANR › CMDLA to ${client}`)).toBeVisible();

  // A booking: "Confirm booking SB… with the carrier", due tomorrow.
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const sb = await page.getByRole("heading", { level: 1 }).innerText();
  await open(page, `/activity?q=${encodeURIComponent(sb)}`);
  await expect(page.getByText(`Confirm booking ${sb} with the carrier`)).toBeVisible();

  // A task typed by hand carries its type too.
  await page.getByLabel("New task").fill(`Call the terminal ${t}`);
  await page.getByLabel("Type").selectOption("Call");
  await submit(page, page.getByRole("button", { name: "Add task" }));
  await expectToast(page, "Task added");
  await open(page, `/activity?q=${encodeURIComponent(`Call the terminal ${t}`)}`);
  await expect(page.getByText(`Call the terminal ${t}`).locator("..").locator("..")).toContainText(
    "Call",
  );
});

import { expect, type Locator, type Page } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@asasline.com",
  password: process.env.E2E_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "change-me-now-please",
};

/** A suffix that keeps records from different runs apart in a shared dev database. */
export const tag = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/**
 * A UN/LOCODE no real port has, in Antarctica (AQ: a country of Settings › Countries that no
 * document rule names): a port field adds it to Settings › Ports. About 39 000 of them.
 */
export const portTag = () => {
  const pick = (from: string) => from[Math.floor(Math.random() * from.length)];
  const rest = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789";
  return `AQ${pick(rest)}${pick(rest)}${pick(rest)}`;
};

/**
 * Opens a page and waits until React has hydrated it (`<HydrationMark>`): a field typed into
 * before that is rewritten by hydration, and the test reads a value nobody typed.
 */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator("html[data-hydrated='1']").waitFor({ state: "attached" });
  // The office's pages stream behind a loading boundary and hydrate after the shell: wait until
  // every form control in the main region carries its React fiber, i.e. is hydrated.
  const hydrated = () => {
    const main = document.querySelector("main");
    if (!main) return true;
    const nodes = [main, ...main.querySelectorAll("form, textarea, input, select, button")];
    if (!nodes.every((n) => Object.keys(n).some((k) => k.startsWith("__reactFiber")))) return false;
    // A fiber exists from the render; the form's own mark is set by its effect, after the commit.
    return [...document.querySelectorAll("form[data-action-form]")].every(
      (f) => f.getAttribute("data-hydrated") === "1",
    );
  };
  try {
    await page.waitForFunction(hydrated, undefined, { timeout: 20_000 });
  } catch {
    // Say which form never hydrated: the usual cause is a component that rendered on the server
    // and was never mounted by React (a dialog's hidden copy, a stale key).
    const left = await page.evaluate(() =>
      [...document.querySelectorAll("form[data-action-form]:not([data-hydrated])")].map((f) =>
        f.outerHTML.slice(0, 160),
      ),
    );
    throw new Error(`${path} did not hydrate; forms without their mark: ${JSON.stringify(left)}`);
  }
}

export async function login(page: Page, who = ADMIN) {
  await open(page, "/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The first sign-in on a cold server compiles the office; bcrypt and the redirect add up.
  await expect(page).toHaveURL("/", { timeout: 20_000 });
}

/** Sonner toasts: wait for the text, so a test reads the outcome the person reads. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

/**
 * Clicks a submit button and waits for that server action's own response. Waiting for a toast
 * alone is a race: the previous save's toast may still be on screen.
 */
/**
 * Clicks and waits for the outcome: the server action's response — or, when the form refuses
 * the input in the browser first (the same zod schema as the server, so no request is made),
 * the refusal's toast.
 */
export async function submit(page: Page, button: Locator) {
  const answered = page
    .waitForResponse(
      (r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined,
    )
    .catch(() => null);
  const refused = page
    .locator("[data-sonner-toast][data-type=error]")
    .first()
    .waitFor({ state: "visible" })
    .catch(() => null);
  await button.click();
  await Promise.race([answered, refused]);
}

/** A VAT number no other contact has: a Belgian one with valid check digits (97 − first eight mod 97). */
export function uniqueVat(country: "BE" | "DE"): string {
  const seven = String(Date.now()).slice(-7);
  if (country === "DE") return `DE${seven}${Math.floor(Math.random() * 90 + 10)}`;
  const base = `0${seven}`;
  return `BE${base}${String(97 - (Number(base) % 97)).padStart(2, "0")}`;
}

type Choice = string | { label: string } | { value: string } | { index: number };

/**
 * Picks an option in the app's select (Base UI, not a native <select>): opens it and clicks the
 * option by its text, its value or its position — the arguments `selectOption` took.
 */
export async function choose(select: Locator, choice: Choice) {
  await select.click();
  const list = select.page().getByRole("listbox");
  await list.waitFor();
  const options = list.getByRole("option");
  const target =
    typeof choice === "string"
      ? list
          .locator(`[role="option"][data-value="${choice.replace(/"/g, '\\"')}"]`)
          .or(list.getByRole("option", { name: choice, exact: true }))
      : "label" in choice
        ? list.getByRole("option", { name: choice.label, exact: true })
        : "value" in choice
          ? list.locator(`[role="option"][data-value="${choice.value}"]`)
          : options.nth(choice.index);
  await target.first().click();
  await list.waitFor({ state: "hidden" });
}

/** The value an app select holds (a native one's `toHaveValue`). */
export async function expectChosen(select: Locator, value: string | RegExp) {
  await expect(select).toHaveAttribute("data-value", value);
}

let vatSeq = 0;
/** A Belgian VAT number that passes the check digits and no other test run has used. */
export function freshVat() {
  const seven = String((Date.now() + vatSeq++) % 1e7).padStart(7, "0");
  // Belgian check digits: 97 minus the first eight digits ("0" + seven) modulo 97.
  const check = 97 - (Number(`0${seven}`) % 97);
  return `BE0${seven}${String(check).padStart(2, "0")}`;
}

/**
 * Before "Create contact": what the form requires and the test left empty — a company's VAT,
 * EORI and address, a person's way to reach them — so a test types only what it is about.
 */
export async function fillMandatory(page: Page) {
  const empty = async (label: string | RegExp) => {
    const f = page.getByLabel(label).first();
    return (await f.isVisible()) && (await f.inputValue()) === "";
  };
  const person = (await page.locator("#type").getAttribute("data-value")) === "person";
  if (!person) {
    // In the format of the country the test picked (Settings › Number formats); else Belgium's.
    const cc = (await page.locator('input[name="country"]').first().inputValue()) || "BE";
    const digits = (n: number) =>
      String(Date.now() + vatSeq++)
        .slice(-n)
        .padStart(n, "0");
    const vat = cc === "BE" ? freshVat() : `${cc}${digits(9)}`;
    const eori = cc === "BE" ? vat : `${cc}${digits(cc === "DE" ? 15 : 12)}`;
    if (await empty(/^VAT number/)) await page.getByLabel(/^VAT number/).fill(vat);
    if (await empty(/^EORI/)) await page.getByLabel(/^EORI/).fill(eori);
    // A company names its trade (a location has none to give).
    const company = (await page.locator("#type").getAttribute("data-value")) !== "location";
    if (company && (await empty(/^Professions/)))
      await page.getByLabel(/^Professions/).fill("Transporter");
  } else if ((await empty(/^Email/)) && (await empty(/^Phone/))) {
    await page
      .getByLabel(/^Email/)
      .first()
      .fill("someone@e2e.test");
  }
  if (await empty(/^Street/))
    await page
      .getByLabel(/^Street/)
      .first()
      .fill("Kaai 1");
  const country = page.getByRole("combobox", { name: "Country" }).first();
  if ((await country.inputValue()) === "") {
    // The country is only filled in: its language (French for Belgium) is not the test's subject.
    const lang = page.locator("#lang");
    const byCountry = (await lang.count()) > 0 && (await lang.getAttribute("data-value")) === "";
    await country.fill("BE");
    await page.getByRole("option").first().click();
    if (byCountry) await choose(lang, "en");
  }
  // The city after the country: one of the country's — Antwerpen in Belgium, else its biggest.
  if (await empty(/^City/)) {
    const cc = await page.locator('input[name="country"]').first().inputValue();
    await pickCity(page, cc === "BE" ? "Antwerpen" : "");
  }
}

/**
 * A city picked from its country's list (the country chosen first): typed — any of its names,
 * "Bruxelles" finds Brussels — then its first match clicked. `scope` is a dialog when in one.
 */
export async function pickCity(page: Page, words: string, scope: Page | Locator = page) {
  const box = scope.getByRole("combobox", { name: "City" }).first();
  await box.click();
  await box.fill(words);
  if (!words) await box.press("ArrowDown");
  await page.getByRole("listbox").getByRole("option").first().click();
}

/**
 * The options of an app select, its list opened (a native select's `locator("option")`); close
 * it with Escape before the next step. Each option carries its value in `data-value`.
 */
export async function optionsOf(select: Locator) {
  await select.click();
  const list = select.page().getByRole("listbox");
  await list.waitFor();
  return list.getByRole("option");
}

/**
 * Adds a user from Settings › Users with the temporary password given (they choose their own
 * at the first sign-in: see `firstSignIn`).
 */
export async function addUser(
  page: Page,
  u: { name: string; email: string; password: string; role?: string },
) {
  await open(page, "/settings/users");
  await page.getByRole("button", { name: "+ Add user" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Full name").fill(u.name);
  await dlg.getByLabel("Email", { exact: true }).fill(u.email);
  await choose(dlg.getByRole("combobox", { name: "Role" }), { label: u.role ?? "Docs clerk" });
  await dlg.getByLabel("Temporary password").fill(u.password);
  await submit(page, dlg.getByRole("button", { name: "Add user" }));
  await expectToast(page, `${u.name} can now sign in`);
}

/** A new user's first sign-in: the temporary password, then their own; returns their own. */
export async function firstSignIn(page: Page, email: string, temporary: string) {
  await open(page, "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(temporary);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/change-password$/, { timeout: 20_000 });
  const own = `${temporary}-own`;
  await page.getByLabel("New password").fill(own);
  await page.getByLabel("The same again").fill(own);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  return own;
}

/**
 * "Issue invoice" once the draft's last change has landed: the toast of an added line comes
 * before the page holds the draft's new version, and issuing the old one is a conflict.
 */
export async function issue(page: Page) {
  await page.waitForLoadState("networkidle");
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
}

export type QuoteSpec = {
  client: string;
  pol?: string;
  pod?: string;
  sell: string;
  cost?: string;
  kind?: "export" | "import";
  /** The words the leg's line carries (its carrier): "Ocean freight to Mersin". */
  service?: string;
};

/**
 * A quotation as the office makes one (legacy fQ): an ocean leg of its own in the catalogue,
 * then a new quotation for the customer built from it, port to port. Its first line reads
 * "BEANR › TRMER · <service> <tag>" at the sell price given.
 */
export async function newQuotation(page: Page, q: QuoteSpec) {
  const carrier = await makeCarrier(page, `${q.service ?? "E2E line"} ${tag()}`.slice(0, 60));
  await addOceanLeg(page, { pol: q.pol, pod: q.pod, carrier, sell: q.sell, buy: q.cost });

  await open(page, "/quotations/new");
  if (q.kind) await choose(page.getByLabel("Type", { exact: true }), q.kind);
  const customer = page.getByRole("combobox", { name: "Customer", exact: true });
  await customer.click();
  await customer.fill(q.client);
  await page.getByRole("listbox").getByRole("option", { name: q.client, exact: true }).click();
  await choose(page.getByLabel("Service", { exact: true }), "port_port");
  const leg = page.getByRole("combobox", { name: "Ocean leg", exact: true });
  await leg.click();
  await leg.fill(carrier);
  await page.getByRole("listbox").getByRole("option").first().click();
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  return carrier;
}

/** A shipping line: a company contact with the Carrier profession, as the catalogue picks one. */
export async function makeCarrier(page: Page, name: string) {
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel(/^Professions/).fill("Carrier");
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return name;
}

/** Picks an option of a searchable picker by what is typed: its first match. */
export async function pick(page: Page, box: Locator, words: string) {
  await box.click();
  await box.fill(words);
  const first = page.getByRole("listbox").getByRole("option").first();
  // A free picker (a port code the table lacks) offers nothing: what is typed is kept on blur.
  const found = await first.waitFor({ state: "visible", timeout: 2000 }).then(
    () => true,
    () => false,
  );
  if (found) await first.click();
  else await box.press("Tab");
}

/** The catalogue's "New item" dialog, open: the item's form (legacy fItem). */
export async function newItem(page: Page) {
  await open(page, "/settings/catalogue");
  await page.getByRole("button", { name: "New item" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** An ocean leg in the catalogue (legacy fItem): ports, box and the carrier contact picked. */
export async function addOceanLeg(
  page: Page,
  leg: { pol?: string; pod?: string; carrier?: string; sell: string; buy?: string },
) {
  await newItem(page);
  await pick(page, page.getByRole("combobox", { name: "Port of loading" }), leg.pol ?? "BEANR");
  await pick(page, page.getByRole("combobox", { name: "Port of discharge" }), leg.pod ?? "TRMER");
  if (leg.carrier)
    await pick(page, page.getByRole("combobox", { name: "Shipping line" }), leg.carrier);
  await page.getByLabel("Sell price (€)").fill(leg.sell);
  await page.getByLabel("Buy price / cost (€)").fill(leg.buy ?? "0");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, "Added to the catalogue");
}

/** Every live catalogue item whose words hold `query`, taken out of use: a journey's own leaves. */
export async function takeOutOfCatalogue(page: Page, query: string) {
  for (let i = 0; i < 20; i++) {
    await open(page, `/settings/catalogue?q=${encodeURIComponent(query)}`);
    const item = page.getByRole("table").getByRole("link").first();
    if (!(await item.count())) return;
    await item.click();
    await page.getByRole("button", { name: "Take out of use" }).click();
    await page.getByRole("dialog").getByLabel("Reason").fill("Test material, no longer needed");
    await submit(page, page.getByRole("dialog").getByRole("button", { name: "Take out of use" }));
  }
}

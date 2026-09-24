/**
 * First run: creates the first Admin and the default Settings tables. Idempotent.
 *   npm run db:seed            → admin + config tables
 *   npm run db:seed -- --demo  → plus a few sample contacts (never on the real office)
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../src/server/db/client");
  const { configTables, contacts, rateItems, users } = await import("../src/server/db/schema");
  const { hashPassword } = await import("../src/server/auth/password");
  const { MIN_PASSWORD_LENGTH } = await import("../src/domain/people");
  const { DEFAULT_CANCEL_REASONS } = await import("../src/domain/shipments");
  const { DEFAULT_PAYMENT_TERMS } = await import("../src/domain/accounting");
  const { ADDRESS_TYPES } = await import("../src/domain/contacts");
  const { DEFAULT_RATE_CATEGORIES } = await import("../src/domain/pricing");
  const { DEMO_RATE_ITEMS } = await import("./demo-catalogue");

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!email) throw new Error("SEED_ADMIN_EMAIL is not set (see .env.example)");
  if (password.length < MIN_PASSWORD_LENGTH)
    throw new Error(`SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  if (n === 0) {
    await db.insert(users).values({
      email: email.toLowerCase(),
      name: process.env.SEED_ADMIN_NAME ?? "Admin",
      role: "admin",
      passwordHash: await hashPassword(password),
    });
    console.log(`✓ first Admin created: ${email}`);
  } else {
    console.log(`· ${n} user(s) already exist — admin not touched`);
  }

  await db
    .insert(configTables)
    .values([
      { name: "cancelReasons", value: DEFAULT_CANCEL_REASONS },
      { name: "containerTypes", value: ["20DV", "40DV", "40HC", "45HC", "20RF", "40RF"] },
      { name: "paymentTerms", value: DEFAULT_PAYMENT_TERMS },
      { name: "addressTypes", value: ADDRESS_TYPES },
      { name: "rateCategories", value: DEFAULT_RATE_CATEGORIES },
    ])
    .onConflictDoNothing();
  console.log("✓ config tables present");

  if (process.argv.includes("--demo")) {
    await db
      .insert(contacts)
      .values([
        {
          name: "Os Textile SPRL",
          country: "BE",
          city: "Bruxelles",
          lang: "fr",
          vat: "BE0123456749",
        },
        { name: "Mersin Trading Ltd", country: "TR", city: "Mersin", lang: "tr" },
        { name: "Maersk Belgium", country: "BE", city: "Antwerpen", professions: ["Carrier"] },
      ])
      .onConflictDoNothing();
    console.log("✓ demo contacts added");
    const [{ items }] = await db.select({ items: sql<number>`count(*)::int` }).from(rateItems);
    if (items === 0) {
      await db.insert(rateItems).values(DEMO_RATE_ITEMS);
      console.log(`✓ ${DEMO_RATE_ITEMS.length} demo catalogue items added`);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

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
  const { cities, configTables, contacts, containerTypes, ports, rateItems, users } =
    await import("../src/server/db/schema");
  const { hashPassword } = await import("../src/server/auth/password");
  const { MIN_PASSWORD_LENGTH } = await import("../src/domain/users");
  const { DEFAULT_PAYMENT_TERMS } = await import("../src/domain/accounting");
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
      { name: "paymentTerms", value: DEFAULT_PAYMENT_TERMS },
      { name: "rateCategories", value: DEFAULT_RATE_CATEGORIES },
    ])
    .onConflictDoNothing();
  console.log("✓ config tables present");

  // The list tables (cancel reasons, salutations…) are filled with their defaults by the
  // migration that creates each one: nothing to seed here.

  if (process.argv.includes("--demo")) {
    // Each demo contact's city as its country's row (Settings › Countries, migration 0074).
    const cityOf = async (country: string, name: string) => {
      const [row] = await db
        .select({ id: cities.id })
        .from(cities)
        .where(sql`${cities.country} = ${country} and lower(${cities.name}) = lower(${name})`)
        .orderBy(sql`${cities.population} desc nulls last`)
        .limit(1);
      return row?.id ?? null;
    };
    await db
      .insert(contacts)
      .values([
        {
          name: "Os Textile SPRL",
          country: "BE",
          cityId: await cityOf("BE", "Brussels"),
          lang: "fr",
          vat: "BE0123456749",
        },
        {
          name: "Mersin Trading Ltd",
          country: "TR",
          cityId: await cityOf("TR", "Mersin"),
          lang: "tr",
        },
        { name: "Maersk Belgium", country: "BE", cityId: await cityOf("BE", "Antwerp") },
      ])
      .onConflictDoNothing();
    console.log("✓ demo contacts added");
    const [{ items }] = await db.select({ items: sql<number>`count(*)::int` }).from(rateItems);
    if (items === 0) {
      // Each item's box code as its row of Settings › Lists › Container types.
      const types = await db
        .select({ id: containerTypes.id, label: containerTypes.label })
        .from(containerTypes);
      const typeId = new Map(types.map((t) => [t.label.toUpperCase(), t.id]));
      // And its ports as their rows of Settings › Ports (the legacy ports, migration 0072).
      const portRows = await db.select({ id: ports.id, code: ports.code }).from(ports);
      const portId = new Map(portRows.map((p) => [p.code, p.id]));
      const idOf = (code?: string) => (code ? (portId.get(code) ?? null) : null);
      await db.insert(rateItems).values(
        DEMO_RATE_ITEMS.map(({ containerType, ...item }) => {
          const { pol, pod, ...rest } = item as typeof item & { pol?: string; pod?: string };
          return {
            ...rest,
            polId: idOf(pol),
            podId: idOf(pod),
            containerTypeId: containerType ? (typeId.get(containerType) ?? null) : null,
          };
        }),
      );
      console.log(`✓ ${DEMO_RATE_ITEMS.length} demo catalogue items added`);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

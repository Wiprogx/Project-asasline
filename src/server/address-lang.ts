import "server-only";
import { eq } from "drizzle-orm";
import { langOfAddress } from "@/domain/countries";
import { readCountries } from "./countries";
import { db, type DbOrTx } from "./db/client";
import { cities } from "./db/schema";

/**
 * The language written to a new contact that chose none: its region's when the country has one
 * for it (Flanders: Dutch), read from its city's region or its postcode, else its country's
 * (legacy langOf), English when neither is one the office writes.
 */
export async function langForAddress(
  a: { country?: string | null; zip?: string | null; cityId?: string | null },
  tx: DbOrTx = db,
) {
  const [city] = a.cityId
    ? await tx.select({ region: cities.region }).from(cities).where(eq(cities.id, a.cityId))
    : [];
  return langOfAddress(await readCountries(), {
    country: a.country,
    zip: a.zip,
    region: city?.region ?? null,
  });
}

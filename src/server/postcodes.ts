import "server-only";
import { and, asc, eq, isNull, like, sql } from "drizzle-orm";
import { type PostcodeOption, postcodeKey } from "@/domain/postcodes";
import { cached } from "./cache/cache";
import { COUNTRIES_TAG } from "./countries";
import { db, type DbOrTx } from "./db/client";
import { cities, postalCodes } from "./db/schema";

/** The countries that have a postcode list (BE, NL, LU, FR, DE): only they check one. */
const listed = () =>
  cached("postcodes:countries", { ttlSeconds: 3600, tags: [COUNTRIES_TAG] }, async () =>
    (await db.selectDistinct({ country: postalCodes.country }).from(postalCodes)).map(
      (r) => r.country,
    ),
  );

/**
 * The postcodes starting with what was typed, a city's own first: what a postcode field
 * suggests, each with the city it fills in. Twenty at most.
 */
export async function postcodesLike(
  country: string,
  typed: string,
  cityId?: string | null,
): Promise<PostcodeOption[]> {
  const cc = country.toUpperCase();
  const start = postcodeKey(cc, typed);
  if (!start) return [];
  return db
    .select({
      code: postalCodes.code,
      place: postalCodes.place,
      cityId: postalCodes.cityId,
      city: cities.name,
    })
    .from(postalCodes)
    .leftJoin(cities, eq(cities.id, postalCodes.cityId))
    .where(
      and(
        eq(postalCodes.country, cc),
        isNull(postalCodes.archivedAt),
        like(postalCodes.code, `${start.replace(/[%_]/g, "")}%`),
      ),
    )
    .orderBy(
      cityId ? sql`${postalCodes.cityId} is distinct from ${cityId}` : asc(postalCodes.code),
      asc(postalCodes.code),
      asc(postalCodes.place),
    )
    .limit(20);
}

/** A city's own postcodes, in order: what picking the city offers (one: it fills the field). */
export function postcodesOfCity(country: string, cityId: string): Promise<PostcodeOption[]> {
  return db
    .select({
      code: postalCodes.code,
      place: postalCodes.place,
      cityId: postalCodes.cityId,
      city: cities.name,
    })
    .from(postalCodes)
    .innerJoin(cities, eq(cities.id, postalCodes.cityId))
    .where(
      and(
        eq(postalCodes.country, country.toUpperCase()),
        eq(postalCodes.cityId, cityId),
        isNull(postalCodes.archivedAt),
      ),
    )
    .orderBy(asc(postalCodes.code), asc(postalCodes.place))
    .limit(100);
}

/** Why this postcode cannot go on an address of that country, or null (no list: any code). */
export async function postcodeProblem(
  tx: DbOrTx,
  zip: string | null | undefined,
  country: string | null | undefined,
): Promise<string | null> {
  if (!zip?.trim() || !country) return null;
  const cc = country.toUpperCase();
  if (!(await listed()).includes(cc)) return null;
  const [row] = await tx
    .select({ id: postalCodes.id })
    .from(postalCodes)
    .where(
      and(
        eq(postalCodes.country, cc),
        eq(postalCodes.code, postcodeKey(cc, zip)),
        isNull(postalCodes.archivedAt),
      ),
    )
    .limit(1);
  return row ? null : "Not a postcode of this country — pick one from the list.";
}

import "server-only";
import { inArray } from "drizzle-orm";
import { stopAddress } from "../domain/route-service";
import { cityNameOf } from "./city-sql";
import type { DbOrTx } from "./db/client";
import { contacts } from "./db/schema";

/** A place as the booking, the trucker copy and the quotation write it: "Name, Kaai 1, 2000 Antwerpen, BE". */
export async function addressesOf(
  tx: DbOrTx,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await tx
    .select({
      id: contacts.id,
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: cityNameOf(contacts.cityId),
      country: contacts.country,
    })
    .from(contacts)
    .where(inArray(contacts.id, [...ids]));
  return new Map(
    rows.map((r) => [
      r.id,
      [
        r.name,
        stopAddress({
          street: r.street ?? "",
          zip: r.zip,
          city: r.city ?? "",
          country: r.country ?? "",
        }),
      ]
        .filter(Boolean)
        .join(", "),
    ]),
  );
}

/** One place's words, or nothing when the contact is gone. */
export async function addressOf(tx: DbOrTx, id: string | null): Promise<string | null> {
  if (!id) return null;
  return (await addressesOf(tx, [id])).get(id) ?? null;
}

/**
 * A place as the trucker reads it, one line each: the company's name, its street, its postcode
 * and city with the country, its phone — never all in one phrase.
 */
export async function addressBlocksOf(
  tx: DbOrTx,
  ids: readonly (string | null)[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((x): x is string => !!x))];
  if (!wanted.length) return new Map();
  const rows = await tx
    .select({
      id: contacts.id,
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: cityNameOf(contacts.cityId),
      country: contacts.country,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(inArray(contacts.id, wanted));
  return new Map(
    rows.map((r) => [
      r.id,
      [
        r.name,
        r.street,
        [[r.zip, r.city].filter(Boolean).join(" "), r.country].filter(Boolean).join(", "),
        r.phone,
      ]
        .filter(Boolean)
        .join("\n"),
    ]),
  );
}

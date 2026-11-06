import "server-only";
import { eq, inArray } from "drizzle-orm";
import { termIdFor } from "@/domain/accounting-settings";
import {
  type PaperBox,
  type PaperPlace,
  type PaperQuotation,
  type PaperRoute,
  type PaperStop,
  placeBlock,
} from "@/domain/quotation-paper";
import { commodityWords, type RouteStop } from "@/domain/route-service";
import { readPaymentTerms } from "@/server/accounting-config";
import { requirePermission } from "@/server/auth/dal";
import { cityNameOf } from "@/server/city-sql";
import { officeToday } from "@/server/clock";
import { readCountries } from "@/server/countries";
import { db, type DbOrTx } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { lookupLabels } from "@/server/lookups";
import { getQuotation } from "./queries";

type Quotation = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;
type Route = Quotation["routes"][number];

/** A place in words, in full (domain placeBlock): the loading address and each stop alike. */
type Place = { block: string };

/**
 * The customer's places the paper names (location contacts): the loading address with what
 * the driver needs — mobile, instructions, note — and each stop the same way.
 */
async function placesOf(tx: DbOrTx, ids: readonly string[]): Promise<Map<string, Place>> {
  if (!ids.length) return new Map();
  const [rows, countries] = await Promise.all([
    tx
      .select({
        id: contacts.id,
        name: contacts.name,
        street: contacts.street,
        zip: contacts.zip,
        city: cityNameOf(contacts.cityId),
        country: contacts.country,
        mobile: contacts.mobile,
        instructions: contacts.instructions,
        note: contacts.note,
      })
      .from(contacts)
      .where(inArray(contacts.id, [...ids])),
    readCountries(),
  ]);
  const countryName = new Map(countries.map((c) => [c.code, c.name]));
  return new Map(
    rows.map((r) => {
      const place: PaperPlace = {
        ...r,
        country: r.country ? (countryName.get(r.country) ?? r.country) : null,
      };
      return [r.id, { block: placeBlock(place) }];
    }),
  );
}

/** A stop as the paper prints it: the place in full, and the day and hour the truck is expected. */
const stopOf = (at: Map<string, Place>, s: RouteStop): PaperStop => ({
  place: at.get(s.contactId)?.block ?? "",
  when: [s.date, s.time].filter(Boolean).join(" ") || null,
});

/**
 * Each container's loading in words (as accepting the destination carries it, accept-store
 * loadingOf): the box's own details, else the destination's.
 */
function boxesOf(r: Route, at: Map<string, Place>): PaperBox[] {
  return Array.from({ length: Math.max(1, r.boxes) }, (_, i) => {
    const b = r.boxDetails[i];
    const addressId = b?.loadAddressId ?? r.loadAddressId;
    return {
      loadingMode: b?.loadingMode ?? r.loadingMode,
      loadAddress: addressId ? (at.get(addressId)?.block ?? null) : null,
      stops: (b?.stops ?? r.stops).map((s) => stopOf(at, s)),
    };
  });
}

const placeIds = (routes: readonly Route[]) =>
  routes.flatMap((r) => [
    r.loadAddressId,
    ...r.stops.map((s) => s.contactId),
    ...r.boxDetails.flatMap((b) => [b.loadAddressId, ...b.stops.map((s) => s.contactId)]),
  ]);

/**
 * The quotation as the paper prints it: the customer as written on paper, its payment term
 * (the quotation's, else the customer's), the document type, the places in words and each
 * destination's lines. Null when there is none or it is cancelled.
 */
export async function quotationPaper(id: string): Promise<PaperQuotation | null> {
  await requirePermission("app.quotations");
  const q = await getQuotation(id);
  if (!q || q.status === "cancelled") return null;
  const [[client], terms, docTypes, at] = await Promise.all([
    db
      .select({
        name: contacts.name,
        street: contacts.street,
        zip: contacts.zip,
        city: cityNameOf(contacts.cityId),
        vat: contacts.vat,
        eori: contacts.eori,
        phone: contacts.phone,
        email: contacts.email,
        paymentTermId: contacts.paymentTermId,
      })
      .from(contacts)
      .where(eq(contacts.id, q.clientId)),
    readPaymentTerms(),
    lookupLabels("doc-types"),
    placesOf(
      db,
      placeIds(q.routes).filter((x): x is string => !!x),
    ),
  ]);
  const termId = termIdFor(q.paymentTermId, client?.paymentTermId ?? null);
  const routes: PaperRoute[] = q.routes.map((r) => ({
    ...r,
    lines: r.lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      sellCents: l.sellCents,
      listed: l.listed,
      perBox: l.perBox,
      condition: l.condition,
      vatCode: l.vatCode,
    })),
    boxDetails: boxesOf(r, at),
  }));
  return {
    ref: q.ref,
    day: officeToday(q.createdAt),
    validUntil: q.validUntil,
    kind: q.kind,
    display: q.display,
    paymentTerm: terms.find((t) => t.id === termId)?.name ?? null,
    docType: q.docTypeId ? (docTypes.get(q.docTypeId) ?? null) : null,
    commodity: q.commodity || commodityWords(q.routes.flatMap((r) => r.boxDetails)) || null,
    client: {
      name: client?.name ?? q.client.name,
      street: client?.street ?? null,
      zip: client?.zip ?? null,
      city: client?.city ?? null,
      vat: client?.vat ?? null,
      eori: client?.eori ?? null,
      phone: client?.phone ?? null,
      email: client?.email ?? null,
    },
    routes,
  };
}

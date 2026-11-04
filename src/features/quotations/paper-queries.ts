import "server-only";
import { eq } from "drizzle-orm";
import { termIdFor } from "@/domain/accounting-settings";
import type { PaperBox, PaperQuotation, PaperRoute } from "@/domain/quotation-paper";
import { commodityWords, type RouteStop } from "@/domain/route-service";
import { readPaymentTerms } from "@/server/accounting-config";
import { requirePermission } from "@/server/auth/dal";
import { cityNameOf } from "@/server/city-sql";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { lookupLabels } from "@/server/lookups";
import { addressesOf } from "./accept-store";
import { getQuotation } from "./queries";

type Quotation = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;
type Route = Quotation["routes"][number];

const stopWords = (at: Map<string, string>, s: RouteStop) =>
  [at.get(s.contactId) ?? "", [s.date, s.time].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");

/**
 * Each container's loading in words (as accepting the destination carries it, accept-store
 * loadingOf): the box's own details, else the destination's.
 */
function boxesOf(r: Route, at: Map<string, string>): PaperBox[] {
  return Array.from({ length: Math.max(1, r.boxes) }, (_, i) => {
    const b = r.boxDetails[i];
    const addressId = b?.loadAddressId ?? r.loadAddressId;
    return {
      loadingMode: b?.loadingMode ?? r.loadingMode,
      loadAddress: addressId ? (at.get(addressId) ?? null) : null,
      stops: (b?.stops ?? r.stops).map((s) => stopWords(at, s)),
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
    addressesOf(
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

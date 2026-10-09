import "server-only";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, rateItems, sequences, vessels } from "@/server/db/schema";
import { readFileHintsForEdit } from "@/server/file-config";
import { readPaymentTermsForEdit } from "@/server/accounting-config";
import { readActivityRulesForEdit } from "@/server/activity-config";
import { readBooksForEdit } from "@/server/books-config";
import { readBoxOwnersForEdit, readContainerSpecsForEdit } from "@/server/container-config";
import { readHsCodesForEdit } from "@/server/goods-config";
import { readLoadingModesForEdit } from "@/server/loading-config";
import {
  readReleaseStatesForEdit,
  readSendModesForEdit,
  readTrackStepsForEdit,
} from "@/server/release-config";
import { readPermissionsForEdit } from "@/server/permission-config";
import { readPortsForEdit } from "@/server/port-config";
import { readIdFormatsForEdit } from "@/server/id-config";
import { readAccessWatchForEdit } from "@/server/access-config";
import { readBankAccountsForEdit } from "@/server/bank-config";
import { readQuoteFieldsForEdit } from "@/server/quote-fields-config";

export async function portsForEdit() {
  await requirePermission("app.settings");
  return readPortsForEdit();
}

export async function fileHintsForEdit() {
  await requirePermission("app.settings");
  return readFileHintsForEdit();
}

/** Payment terms, the books' figures and the counters, for Settings › Accounting. */
export async function accountingSettingsForEdit() {
  await requirePermission("app.settings");
  const [terms, books, bank, seq] = await Promise.all([
    readPaymentTermsForEdit(),
    readBooksForEdit(),
    readBankAccountsForEdit(),
    db.select().from(sequences).orderBy(asc(sequences.key)),
  ]);
  return { terms, books, bank, sequences: seq };
}

/** The container specs and the box owners, for Settings › Containers. */
export async function containerTablesForEdit() {
  await requirePermission("app.settings");
  const [specs, owners] = await Promise.all([readContainerSpecsForEdit(), readBoxOwnersForEdit()]);
  return { specs, owners };
}

/** The VAT and EORI formats per country, for Settings › Number formats. */
export async function idFormatsForEdit() {
  await requirePermission("app.settings");
  return readIdFormatsForEdit();
}

/** Which acts of looking are recorded, for Settings › Audit log. */
export async function accessWatchForEdit() {
  await requirePermission("audit.view");
  return readAccessWatchForEdit();
}

/** What the printed quotation shows, for Settings › Quotation document. */
export async function quoteFieldsForEdit() {
  await requirePermission("app.settings");
  return readQuoteFieldsForEdit();
}

export async function activityRulesForEdit() {
  await requirePermission("app.settings");
  return readActivityRulesForEdit();
}

/** The three tables of the Release & tracking page, each with its version. */
export async function releaseTablesForEdit() {
  await requirePermission("app.settings");
  const [release, send, track] = await Promise.all([
    readReleaseStatesForEdit(),
    readSendModesForEdit(),
    readTrackStepsForEdit(),
  ]);
  return { release, send, track };
}

export async function hsCodesForEdit() {
  await requirePermission("app.settings");
  return readHsCodesForEdit();
}

export async function loadingModesForEdit() {
  await requirePermission("app.settings");
  return readLoadingModesForEdit();
}

export async function permissionsForEdit() {
  await requirePermission("app.settings");
  return readPermissionsForEdit();
}

/**
 * The links report (legacy vLinksCard). Parties are contacts by id here (a name typed as text
 * cannot happen) and an invoice goes only to a party on the shipment (guard 10.3), so what is
 * left to report is what still lives as text or is missing: shipping lines with no contact of
 * their name, bookings with no quotation behind their price, customers shipping without a
 * VAT number.
 */
export async function linksReport() {
  await requirePermission("app.settings");
  const names = new Set(
    (
      await db.select({ name: contacts.name }).from(contacts).where(isNull(contacts.archivedAt))
    ).map((c) => c.name.trim().toLowerCase()),
  );
  const [onSailings, onLegs] = await Promise.all([
    db
      .selectDistinct({ carrier: vessels.carrier })
      .from(vessels)
      .where(and(isNull(vessels.archivedAt), sql`${vessels.carrier} is not null`)),
    db
      .selectDistinct({ carrier: rateItems.carrier })
      .from(rateItems)
      .where(and(isNull(rateItems.archivedAt), eq(rateItems.category, "ocean"))),
  ]);
  const carriers = [
    ...new Set([...onSailings, ...onLegs].map((r) => r.carrier?.trim()).filter(Boolean)),
  ]
    .sort()
    .map((name) => ({ name: name!, linked: names.has(name!.toLowerCase()) }));

  const unpriced = await db
    .select({ id: bookings.id, ref: bookings.ref, client: contacts.name })
    .from(bookings)
    .innerJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(
      and(
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
        isNull(bookings.quotationRouteId),
      ),
    )
    .orderBy(bookings.ref)
    .limit(100);

  const noVat = await db
    .selectDistinct({ id: contacts.id, name: contacts.name, country: contacts.country })
    .from(bookings)
    .innerJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(and(ne(bookings.status, "cancelled"), isNull(bookings.archivedAt), isNull(contacts.vat)))
    .orderBy(contacts.name)
    .limit(100);

  return { carriers, unpriced, noVat };
}

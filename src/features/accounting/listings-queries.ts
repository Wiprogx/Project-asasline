import "server-only";
import { DECLARANT } from "@/domain/company";
import {
  clientListing,
  clientListingXml,
  intraListing,
  intraListingXml,
  journalCsv,
} from "@/domain/listings";
import type { Period } from "@/domain/period";
import { vatPeriodRange } from "@/domain/vat";
import { requirePermission } from "@/server/auth/dal";
import { readJournal } from "./ledger-queries";
import { issuedDocs } from "./ledger-store";

/** The annual listing of Belgian customers and one period's intra-community listing. */
export async function listingsScreen(year: string, period: string) {
  await requirePermission("app.accounting");
  const range = vatPeriodRange(period);
  const [yearDocs, periodDocs] = await Promise.all([
    issuedDocs({ from: `${year}-01-01`, to: `${year}-12-31` }),
    issuedDocs(range),
  ]);
  return { clients: clientListing(yearDocs, year), intra: intraListing(periodDocs, range) };
}

export async function clientListingFile(year: string) {
  await requirePermission("app.accounting");
  const docs = await issuedDocs({ from: `${year}-01-01`, to: `${year}-12-31` });
  return clientListingXml(year, clientListing(docs, year), DECLARANT);
}

export async function intraListingFile(period: string) {
  await requirePermission("app.accounting");
  const range = vatPeriodRange(period);
  return intraListingXml(period, intraListing(await issuedDocs(range), range), DECLARANT);
}

/** The journal of a period as a CSV for the accountant. */
export async function journalFile(period: Period) {
  await requirePermission("app.accounting");
  const entries = (await readJournal()).filter((e) => e.date >= period.from && e.date <= period.to);
  return journalCsv(entries);
}

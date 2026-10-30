import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { itemLabel } from "@/domain/pricing";
import { requirePermission } from "@/server/auth/dal";
import { readCountries } from "@/server/countries";
import { db } from "@/server/db/client";
import { rateItems } from "@/server/db/schema";
import { readHsCodes } from "@/server/goods-config";
import { readLoadingModes } from "@/server/loading-config";
import { liveLookups } from "@/server/lookups";
import { readPaymentTerms } from "@/server/accounting-config";
import { livePorts } from "@/server/ports";
import { withRouteWords } from "@/server/route-words";

/**
 * The ocean legs a destination is built from (legacy laneOpts): "BEANR › CMDLA · MSC", found
 * by either port's name or code, the destination country or the carrier.
 */
async function laneChoices() {
  const rows = await withRouteWords(
    await db
      .select()
      .from(rateItems)
      .where(and(eq(rateItems.category, "ocean"), isNull(rateItems.archivedAt)))
      .orderBy(asc(rateItems.name)),
  );
  const [ports, countries] = await Promise.all([livePorts(), readCountries()]);
  const portName = new Map(ports.map((p) => [p.code, p.name]));
  const countryName = new Map(countries.map((c) => [c.code, c.name]));
  return rows.map((it) => ({
    value: it.id,
    label: itemLabel(it),
    keywords: [
      it.pol && portName.get(it.pol),
      it.pod && portName.get(it.pod),
      it.country,
      it.country && countryName.get(it.country),
      it.carrier,
      it.containerType,
    ]
      .filter(Boolean)
      .join(" "),
  }));
}

/** Everything the new-quotation form offers, but the contacts (the page brings those). */
export async function newQuotationChoices() {
  await requirePermission("app.quotations");
  const [lanes, docTypes, terms, modes, hs] = await Promise.all([
    laneChoices(),
    liveLookups("doc-types"),
    readPaymentTerms(),
    readLoadingModes(),
    readHsCodes(),
  ]);
  return {
    lanes,
    docTypes: docTypes.map((d) => ({ value: d.value, label: d.label, code: d.code ?? null })),
    terms: terms.map((t) => ({ value: t.id, label: t.name })),
    modes,
    hs: hs.map((h) => ({ value: h.code, label: h.description, code: h.code })),
  };
}

export type NewQuotationChoices = Awaited<ReturnType<typeof newQuotationChoices>>;

import "server-only";
import { DECLARANT } from "@/domain/company";
import { intervatXml } from "@/domain/vat";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { closedThrough } from "./books-store";
import { computeVatReturn, vatFilingOf } from "./vat-store";

/** Everything the VAT screen shows for one period. */
export async function vatScreen(period: string) {
  await requirePermission("app.accounting");
  const [computed, filed, closed] = await Promise.all([
    computeVatReturn(period),
    vatFilingOf(db, period),
    closedThrough(db),
  ]);
  return { computed, filed, closedThrough: closed };
}

/** The Intervat draft file: what was filed if the period is filed, else what the documents give now. */
export async function intervatFile(period: string) {
  await requirePermission("app.accounting");
  const filed = await vatFilingOf(db, period);
  const grids = filed
    ? new Map(Object.entries(filed.filing.grids))
    : (await computeVatReturn(period)).grids;
  return intervatXml(period, grids, DECLARANT);
}

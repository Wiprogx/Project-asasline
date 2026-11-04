import "server-only";
import { QUOTATION_VIEW } from "@/domain/quotation-list";
import { requirePermission } from "@/server/auth/dal";
import { readTableView } from "@/server/prefs";

/** The columns and widths the signed-in person chose for the quotations list. */
export async function quotationView() {
  const user = await requirePermission("app.quotations");
  return readTableView(user.id, QUOTATION_VIEW);
}

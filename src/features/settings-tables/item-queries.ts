import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { readLineItemsForEdit } from "@/server/line-items-config";

/** The line items table as Settings edits it, with the version the save is checked against. */
export async function lineItemsForEdit() {
  await requirePermission("app.settings");
  return readLineItemsForEdit();
}

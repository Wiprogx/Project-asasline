import "server-only";
import { CONTACT_VIEW } from "@/domain/contact-list";
import { requirePermission } from "@/server/auth/dal";
import { readTableView } from "@/server/prefs";

/** The columns and widths the signed-in person chose for the contacts list. */
export async function contactView() {
  const user = await requirePermission("app.contacts");
  return readTableView(user.id, CONTACT_VIEW);
}

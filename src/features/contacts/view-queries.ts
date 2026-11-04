import "server-only";
import {
  CONTACT_COLUMNS,
  CONTACT_NAME_COLUMN,
  CONTACT_VIEW_PREF,
  type ContactColumnKey,
  DEFAULT_CONTACT_COLUMNS,
} from "@/domain/contact-list";
import { parseTablePrefs, type TablePrefs } from "@/domain/table-prefs";
import { requirePermission } from "@/server/auth/dal";
import { readPref } from "@/server/prefs";

/** The keys a person may size: the name column and every column offered. */
export const SIZABLE_CONTACT_COLUMNS: readonly string[] = [
  CONTACT_NAME_COLUMN.key,
  ...CONTACT_COLUMNS.map((c) => c.key),
];

/** The columns and widths the signed-in person chose for the contacts list. */
export async function contactView(): Promise<TablePrefs<ContactColumnKey>> {
  const user = await requirePermission("app.contacts");
  return parseTablePrefs(
    CONTACT_COLUMNS,
    DEFAULT_CONTACT_COLUMNS,
    await readPref(user.id, CONTACT_VIEW_PREF),
    SIZABLE_CONTACT_COLUMNS,
  );
}

import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { readCountriesForEdit } from "@/server/country-config";

/** The countries table as Settings edits it, with the version the save is checked against. */
export async function countriesForEdit() {
  await requirePermission("app.settings");
  return readCountriesForEdit();
}

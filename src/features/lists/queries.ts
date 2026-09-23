import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { CONFIG_NAMES, readConfigForEdit } from "@/server/config-tables";

/** Every editable list with the version its editor must send back. */
export async function listsForEdit() {
  await requirePermission("app.settings");
  return Promise.all(
    CONFIG_NAMES.map(async (name) => ({ name, ...(await readConfigForEdit(name)) })),
  );
}

import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { readHolidaysForEdit, readRuleBookForEdit } from "@/server/rule-book";

export async function ruleBookForEdit() {
  await requirePermission("app.settings");
  return readRuleBookForEdit();
}

export async function holidaysForEdit() {
  await requirePermission("app.settings");
  const { value, version } = await readHolidaysForEdit();
  return { value: [...value].sort((a, b) => a.date.localeCompare(b.date)), version };
}

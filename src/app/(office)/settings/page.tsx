import { redirect } from "next/navigation";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";

export default async function SettingsPage() {
  const user = await requireUser();
  if (can(user.role, "app.settings")) redirect("/settings/people");
  if (can(user.role, "audit.view")) redirect("/settings/audit");
  redirect("/");
}

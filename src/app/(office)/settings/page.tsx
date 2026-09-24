import { redirect } from "next/navigation";
import { may } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";

export default async function SettingsPage() {
  const user = await requireUser();
  if (may(user, "app.settings")) redirect("/settings/people");
  if (may(user, "audit.view")) redirect("/settings/audit");
  redirect("/");
}

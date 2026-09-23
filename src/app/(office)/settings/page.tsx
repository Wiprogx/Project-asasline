import type { Metadata } from "next";
import { ModulePending } from "@/components/shared/module-pending";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePagePermission("app.settings");
  return (
    <ModulePending
      title="Settings"
      legacy="demo.html lines 10236–11550 and 14742–15360"
      scope={[
        "Every editable list as a row in config_tables (ports, cut-offs, document rules…)",
        "People: add, set role, switch off (never delete; at least one Admin remains)",
        "Permission matrix, audit trail, links report, integrations",
      ]}
    />
  );
}

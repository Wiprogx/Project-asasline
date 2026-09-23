import type { Metadata } from "next";
import { ModulePending } from "@/components/shared/module-pending";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  await requirePagePermission("app.activity");
  return (
    <ModulePending
      title="Activity"
      legacy="demo.html lines 11550–12625 (Activity filters & calendar, withdraw) and 9049–10236 (document rules engine)"
      scope={[
        "My tasks (default), person filter, date pager and month calendar",
        "Document rules engine (DOC_RULES): anchors, working days, holidays per country",
        "Away & cover, hand-over, withdraw / put back with a reason",
        "Search by SB, container or customer; the undated bucket",
      ]}
    />
  );
}

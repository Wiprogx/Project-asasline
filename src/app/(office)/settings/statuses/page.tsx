import type { Metadata } from "next";
import { StatusesCard } from "@/features/settings-tables/components/statuses-card";
import { statusCounts } from "@/features/settings-tables/status-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Statuses" };

/** The quotation and booking statuses with their counts, and the next numbers (legacy qstatus, bstatus). */
export default async function StatusesPage() {
  await requirePagePermission("app.settings");
  const counts = await statusCounts();
  return <StatusesCard counts={counts} />;
}

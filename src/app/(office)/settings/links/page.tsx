import type { Metadata } from "next";
import { LinksReport } from "@/features/settings-tables/components/links-report";
import { linksReport } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Links" };

export default async function LinksPage() {
  await requirePagePermission("app.settings");
  return <LinksReport r={await linksReport()} />;
}

import type { Metadata } from "next";
import { QuotationsTable } from "@/features/quotations/components/quotations-table";
import { listQuotations } from "@/features/quotations/queries";
import { quotationView } from "@/features/quotations/view-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Quotations" };

export default async function ContactQuotationsPage({
  params,
}: PageProps<"/contacts/[id]/quotations">) {
  await requirePagePermission("app.quotations");
  const { id } = await params;
  const [rows, view] = await Promise.all([listQuotations({ clientId: id }), quotationView()]);
  return <QuotationsTable rows={rows} columns={view.columns} widths={view.widths} />;
}

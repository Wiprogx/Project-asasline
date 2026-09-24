import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { can } from "@/domain/permissions";
import { QuotationRoutes } from "@/features/quotations/components/quotation-routes";
import { QUOTATION_TONE } from "@/features/quotations/status";
import { getQuotation } from "@/features/quotations/queries";
import { requirePagePermission } from "@/server/auth/dal";

export default async function QuotationPage({ params }: PageProps<"/quotations/[id]">) {
  const user = await requirePagePermission("app.quotations");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const q = await getQuotation(id.data);
  if (!q) notFound();
  const [label, tone] = QUOTATION_TONE[q.status];
  const canBook = q.status !== "cancelled" && can(user.role, "bookings.edit");

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{q.ref}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ToneBadge tone={tone}>{label}</ToneBadge>
            <Link className="hover:underline" href={`/contacts/${q.client.id}`}>
              {q.client.name}
            </Link>
            {q.validUntil && <span>· valid until {q.validUntil}</span>}
          </span>
        }
      />
      <QuotationRoutes q={q} showCost={can(user.role, "costs.view")} canBook={canBook} />
    </>
  );
}

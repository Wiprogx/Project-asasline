import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { may } from "@/domain/permissions";
import { QuotationRoutes } from "@/features/quotations/components/quotation-routes";
import { catalogueChoices, getQuotation } from "@/features/quotations/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readLoadingModes } from "@/server/loading-config";

export async function generateMetadata({
  params,
}: PageProps<"/quotations/[id]">): Promise<Metadata> {
  const id = z.uuid().safeParse((await params).id);
  const q = id.success ? await getQuotation(id.data) : null;
  return { title: q ? `${q.ref} · ${q.client.name}` : "Quotation" };
}

/** The layout already validated the id and the permission; getQuotation is request-cached. */
export default async function QuotationPage({ params }: PageProps<"/quotations/[id]">) {
  const user = await requirePagePermission("app.quotations");
  const q = await getQuotation((await params).id);
  if (!q) notFound();
  const open = q.status !== "cancelled";
  const [choices, modes] = open
    ? await Promise.all([catalogueChoices(), readLoadingModes()])
    : [null, []];
  return (
    <QuotationRoutes
      q={q}
      showCost={may(user, "costs.view")}
      canBook={open && may(user, "bookings.edit")}
      choices={choices}
      modes={modes}
    />
  );
}

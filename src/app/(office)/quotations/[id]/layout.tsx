import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SubNav } from "@/components/layout/sub-nav";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { may } from "@/domain/permissions";
import { creditStanding } from "@/features/accounting/reminder-queries";
import { QuotationActions } from "@/features/quotations/components/quotation-actions";
import { getQuotation, quotationLetter } from "@/features/quotations/queries";
import { QUOTATION_TONE } from "@/features/quotations/status";
import { requirePagePermission } from "@/server/auth/dal";

/** The quotation's header, actions and tabs (legacy quotation tabs); each tab is its own URL. */
export default async function QuotationLayout({
  params,
  children,
}: LayoutProps<"/quotations/[id]">) {
  const user = await requirePagePermission("app.quotations");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const q = await getQuotation(id.data);
  if (!q) notFound();
  const [label, tone] = QUOTATION_TONE[q.status];
  const letter = q.status !== "cancelled" ? await quotationLetter(q, user.name) : null;
  const credit = may(user, "app.accounting") ? await creditStanding(q.client.id) : null;
  const base = `/quotations/${q.id}`;
  const tabs = [
    { href: base, label: "Quotation", exact: true },
    ...(may(user, "app.activity") ? [{ href: `${base}/tasks`, label: "Tasks" }] : []),
    ...(may(user, "app.discuss") ? [{ href: `${base}/messages`, label: "Messages" }] : []),
    { href: `${base}/history`, label: "History" },
  ];
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
            {credit?.problem && <ToneBadge tone="danger">{credit.problem}</ToneBadge>}
            {q.sentOn && (
              <span>
                · sent {q.sentOn} by {q.sentVia === "whatsapp" ? "WhatsApp" : "e-mail"}
              </span>
            )}
          </span>
        }
        actions={letter && <QuotationActions q={q} letter={letter} />}
      />
      <SubNav items={tabs} />
      {children}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactOptions } from "@/features/contacts/queries";
import { LogIncomingDialog } from "@/features/discuss/components/log-incoming-dialog";
import { MessageItem } from "@/features/discuss/components/message-item";
import { SendForm } from "@/features/discuss/components/send-form";
import { messagesForRecord, routingTable } from "@/features/discuss/queries";
import { getQuotation } from "@/features/quotations/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Quotation messages" };

/** The quotation's correspondence (legacy Messages tab): the route composes Quotations and Discuss. */
export default async function QuotationMessagesPage({
  params,
}: PageProps<"/quotations/[id]/messages">) {
  await requirePagePermission("app.discuss");
  const { id } = await params;
  const q = await getQuotation(id);
  if (!q) notFound();
  const [rows, contacts, routes] = await Promise.all([
    messagesForRecord("quotation", id),
    contactOptions(),
    routingTable(),
  ]);
  const recipients = [
    {
      id: q.client.id,
      label: `${q.client.name} (Customer)`,
      email: q.client.email,
      whatsapp: q.client.whatsapp ?? q.client.mobile,
    },
  ];
  return (
    <div className="grid gap-4">
      <LiveRefresh linkId={id} />
      <Card>
        <CardHeader>
          <CardTitle>Write</CardTitle>
        </CardHeader>
        <CardContent>
          <SendForm linkRef={q.ref} recipients={recipients} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Messages ({rows.length})</CardTitle>
          <LogIncomingDialog contacts={contacts} routes={routes} linkRef={q.ref} />
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No messages on this quotation yet.
            </p>
          ) : (
            <ul>
              {rows.map((m) => (
                <MessageItem key={m.id} m={m} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

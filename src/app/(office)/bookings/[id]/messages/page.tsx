import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBooking } from "@/features/bookings/queries";
import { contactOptions } from "@/features/contacts/queries";
import { LogIncomingDialog } from "@/features/discuss/components/log-incoming-dialog";
import { MessageItem } from "@/features/discuss/components/message-item";
import { SendForm } from "@/features/discuss/components/send-form";
import {
  bookingRecipients,
  bookingTemplates,
  messagesForRecord,
  routingTable,
} from "@/features/discuss/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Booking messages" };

/** The booking's correspondence (legacy Messages tab): the route composes Bookings and Discuss. */
export default async function BookingMessagesPage({
  params,
}: PageProps<"/bookings/[id]/messages">) {
  const user = await requirePagePermission("app.discuss");
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();
  const [rows, recipients, contacts, routes, templates] = await Promise.all([
    messagesForRecord("booking", id),
    bookingRecipients(id),
    contactOptions(),
    routingTable(),
    bookingTemplates(id, user.name),
  ]);

  return (
    <div className="grid gap-4">
      <LiveRefresh linkId={id} />
      <Card>
        <CardHeader>
          <CardTitle>Write</CardTitle>
        </CardHeader>
        <CardContent>
          <SendForm linkRef={b.ref} recipients={recipients} templates={templates} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Messages ({rows.length})</CardTitle>
          <LogIncomingDialog contacts={contacts} routes={routes} linkRef={b.ref} />
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No messages on this booking yet.
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

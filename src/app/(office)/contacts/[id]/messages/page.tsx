import type { Metadata } from "next";
import { MessageItem } from "@/features/discuss/components/message-item";
import { allMessages } from "@/features/discuss/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Messages" };

/** Every mail, call and WhatsApp with this contact, newest first. */
export default async function ContactMessagesPage({
  params,
}: PageProps<"/contacts/[id]/messages">) {
  await requirePagePermission("app.discuss");
  const { id } = await params;
  const rows = await allMessages({ contactId: id });
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No message with this contact yet.</p>;
  return (
    <ul aria-label="Messages" className="grid gap-2">
      {rows.map((m) => (
        <MessageItem key={m.id} m={m} />
      ))}
    </ul>
  );
}

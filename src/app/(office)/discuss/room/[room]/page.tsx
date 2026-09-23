import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL, type Role } from "@/domain/permissions";
import { ChatComposer } from "@/features/discuss/components/chat-composer";
import { MessageItem } from "@/features/discuss/components/message-item";
import { roomMessages } from "@/features/discuss/queries";
import { ROOMS } from "@/features/discuss/schemas";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Office chat" };

/** Internal chat: never leaves the office (invariant 8). */
export default async function RoomPage({ params }: PageProps<"/discuss/room/[room]">) {
  await requirePagePermission("app.discuss");
  const { room } = await params;
  if (!(ROOMS as readonly string[]).includes(room)) notFound();
  const rows = await roomMessages(room);
  const title = room === "office" ? "The whole office" : `${ROLE_LABEL[room as Role]}s`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <ul aria-label="Messages" aria-live="polite">
            {rows.map((m) => (
              <MessageItem key={m.id} m={m} />
            ))}
          </ul>
        )}
        <ChatComposer room={room} />
      </CardContent>
    </Card>
  );
}

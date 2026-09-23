import type { Metadata } from "next";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { CHANNELS } from "@/domain/messages";
import { MessageItem } from "@/features/discuss/components/message-item";
import { allMessages } from "@/features/discuss/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "All messages" };

type Channel = (typeof CHANNELS)[number];
const isChannel = (c: unknown): c is Channel => CHANNELS.includes(c as Channel);

export default async function AllMessagesPage({ searchParams }: PageProps<"/discuss/all">) {
  await requirePagePermission("app.discuss");
  const sp = await searchParams;
  const rows = await allMessages({
    q: typeof sp.q === "string" ? sp.q : undefined,
    channel: isChannel(sp.channel) ? sp.channel : undefined,
  });
  return (
    <div className="grid gap-4">
      <SearchInput placeholder="Search subject, text, sender or SB/QT number…" />
      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages match.</p>
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

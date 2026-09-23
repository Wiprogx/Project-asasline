import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/shared/tone-badge";
import { ROLE_LABEL } from "@/domain/permissions";
import { contactOptions } from "@/features/contacts/queries";
import { ClaimButton } from "@/features/discuss/components/claim-button";
import { LogIncomingDialog } from "@/features/discuss/components/log-incoming-dialog";
import { MessageItem } from "@/features/discuss/components/message-item";
import { routingTable, waitingQueue } from "@/features/discuss/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Waiting" };

/**
 * What waits for an answer, routed to my role (or every role with ?all=1). The first to take a
 * message owns it; nothing is broadcast to everyone.
 */
export default async function QueuePage({ searchParams }: PageProps<"/discuss/queue">) {
  const user = await requirePagePermission("app.discuss");
  const all = (await searchParams).all === "1";
  const [rows, contacts, routes] = await Promise.all([
    waitingQueue(all ? null : user.role),
    contactOptions(),
    routingTable(),
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>
            {rows.length} waiting {all ? "for anyone" : `for ${ROLE_LABEL[user.role]}`}
          </CardTitle>
          <CardDescription>
            Unanswered messages from outside, oldest first.{" "}
            <Link className="underline" href={all ? "/discuss/queue" : "/discuss/queue?all=1"}>
              {all ? "Only my role" : "Every role"}
            </Link>
          </CardDescription>
        </div>
        <LogIncomingDialog contacts={contacts} routes={routes} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing is waiting.</p>
        ) : (
          <ul>
            {rows.map((m) => (
              <MessageItem
                key={m.id}
                m={m}
                actions={
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {m.escalated && (
                      <ToneBadge tone="warning">Nobody took it — {m.waited} min</ToneBadge>
                    )}
                    {(all || m.routeRole !== user.role) && ROLE_LABEL[m.routeRole]}
                    <ClaimButton id={m.id} />
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

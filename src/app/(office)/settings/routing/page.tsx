import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RoutingEditor } from "@/features/discuss/components/routing-editor";
import { routingForEdit } from "@/features/discuss/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { InboxForm } from "@/features/discuss/components/inbox-form";
import { AutoSendForm } from "@/features/discuss/components/auto-send-form";
import { saveWhatsAppNumbers } from "@/features/discuss/channel-actions";
import { LinesEditor } from "@/components/shared/lines-editor";
import { whatsAppLines } from "@/domain/channels";

export const metadata: Metadata = { title: "Routing" };

/** Who answers what: each topic goes to a role; unanswered, it reaches the Team lead too. */
export default async function RoutingPage() {
  await requirePagePermission("app.settings");
  const r = await routingForEdit();
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Message routing</h2>
          <p className="text-sm text-muted-foreground">
            A message goes to the role of its topic — whoever holds the role when it arrives. A new
            topic is switched on once saved.
          </p>
        </CardHeader>
        <CardContent>
          <RoutingEditor {...r} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Inbox and signature</h2>
          <p className="text-sm text-muted-foreground">
            Where the office&apos;s files arrive, and how every letter it writes is signed.
          </p>
        </CardHeader>
        <CardContent>
          <InboxForm inbox={r.inbox} version={r.inboxVersion} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Automatic sending</h2>
          <p className="text-sm text-muted-foreground">
            Pick-up, terminal, sailing, delay and arrival go to the customer by themselves when the
            journey step is ticked, each written on the booking as sent automatically. Nothing is
            ever sent to everybody.
          </p>
        </CardHeader>
        <CardContent>
          <AutoSendForm setting={r.autoSend} version={r.autoSendVersion} />
        </CardContent>
      </Card>
      <LinesEditor
        action={saveWhatsAppNumbers}
        title="WhatsApp numbers"
        description='The numbers the office writes from, one per line: "label | number | WhatsApp Business phone id | yes or no". One is active: a message goes out from it (the phone id is what the Business API sends from; empty, the one configured on the server).'
        label="WhatsApp numbers, one per line"
        submitLabel="Save WhatsApp numbers"
        lines={whatsAppLines(r.whatsapp)}
        version={r.whatsappVersion}
        count={r.whatsapp.length}
      />
    </div>
  );
}

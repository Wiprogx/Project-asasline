import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RoutingEditor } from "@/features/discuss/components/routing-editor";
import { routingForEdit } from "@/features/discuss/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Routing" };

/** Who answers what: each topic goes to a role; unanswered, it reaches the Team lead too. */
export default async function RoutingPage() {
  await requirePagePermission("app.settings");
  const r = await routingForEdit();
  return (
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
  );
}

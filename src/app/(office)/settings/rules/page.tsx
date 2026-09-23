import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleDialog } from "@/features/rules/components/rule-dialog";
import { RulesTable } from "@/features/rules/components/rules-table";
import { ruleBookForEdit } from "@/features/rules/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Document rules" };

export default async function RulesPage() {
  await requirePagePermission("app.settings");
  const { value: rules, version } = await ruleBookForEdit();
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Document rules</CardTitle>
          <CardDescription>
            One rule book for every destination. A new country is a new row here, not new code.
            Saving re-plans every live booking.
            {version === 0 && " (Built-in defaults — not yet saved.)"}
          </CardDescription>
        </div>
        <RuleDialog index="new" version={version} trigger="Add rule" />
      </CardHeader>
      <CardContent>
        <RulesTable rules={rules} version={version} />
      </CardContent>
    </Card>
  );
}

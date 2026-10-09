import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { activityRuleLines, TRIGGER_LABEL, TRIGGERS } from "@/domain/activity-rules";
import { saveActivityRules } from "@/features/settings-tables/actions";
import { activityRulesForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { NotifyLevelsCard } from "@/features/activity/components/notify-levels-card";

export const metadata: Metadata = { title: "Automatic activities" };

const DESCRIPTION = `When something happens, a task opens for somebody with a due day. One rule per line: "trigger | Label | Task title with {ref} {client} {dest} | type | role | days | on or off". Triggers: ${TRIGGERS.map((t) => `${t} (${TRIGGER_LABEL[t]})`).join(", ")}. The task goes to the person who caused the event, under the rule's role. "doc_missing" is the document rules' job and "invoice_overdue" the reminders'; both stay off here.`;

export default async function ActivityRulesPage() {
  await requirePagePermission("app.settings");
  const { rules, version } = await activityRulesForEdit();
  return (
    <div className="grid gap-4">
      <LinesEditor
        action={saveActivityRules}
        title="Automatic activities"
        description={DESCRIPTION}
        label="Automatic activities, one per line"
        submitLabel="Save automatic activities"
        lines={activityRuleLines(rules)}
        version={version}
        count={rules.length}
      />
      <NotifyLevelsCard />
    </div>
  );
}

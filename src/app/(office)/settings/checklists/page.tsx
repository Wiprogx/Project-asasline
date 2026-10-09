import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { checklistLines } from "@/domain/checklists";
import { saveChecklists } from "@/features/settings-tables/checklist-actions";
import { checklistsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Checklists" };

/** What a paper must carry before it is good (legacy CHECKLISTS), checked item by item. */
export default async function ChecklistsPage() {
  await requirePagePermission("app.settings");
  const { lists, version } = await checklistsForEdit();
  return (
    <LinesEditor
      action={saveChecklists}
      title="Checklists"
      description='One item per line: "list | List label | item | What must be on the paper | hint". A document rule names a list by its key (Settings › Document rules › Checklist); that paper is then checked item by item, and anything left unticked becomes its own task.'
      label="Checklist items, one per line"
      submitLabel="Save checklists"
      lines={checklistLines(lists)}
      version={version}
      count={lists.length}
    />
  );
}

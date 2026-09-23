import type { Metadata } from "next";
import { ListEditor } from "@/features/lists/components/list-editor";
import { listsForEdit } from "@/features/lists/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Lists" };

export default async function ListsPage() {
  await requirePagePermission("app.settings");
  const lists = await listsForEdit();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {lists.map((l) => (
        <ListEditor key={l.name} name={l.name} values={l.values} version={l.version} />
      ))}
    </div>
  );
}

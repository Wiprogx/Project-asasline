import type { Metadata } from "next";
import { saveFileHints } from "@/features/settings-tables/actions";
import { LinesEditor } from "@/features/settings-tables/components/lines-editor";
import { fileHintsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Filing rules" };

export default async function FilingPage() {
  await requirePagePermission("app.settings");
  const { hints, version } = await fileHintsForEdit();
  return (
    <LinesEditor
      action={saveFileHints}
      title="Filing rules"
      description='How a file is filed by its name: one rule per line, the words it may contain, then the code — "invoice, facture, factuur → INVOICE". The first rule whose words appear in the name wins; a step code (EXA, CERTIWEIGHT…) files the paper against that step.'
      label="Filing rules, one per line"
      lines={hints.map((h) => `${h.words} → ${h.code}`).join("\n")}
      version={version}
      count={hints.length}
    />
  );
}

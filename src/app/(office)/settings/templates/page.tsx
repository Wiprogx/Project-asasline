import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TemplateEditor } from "@/features/discuss/components/template-editor";
import { templatesForEdit } from "@/features/discuss/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Templates" };

/** The letters the office writes again and again; picked on a booking's Messages tab. */
export default async function TemplatesPage() {
  await requirePagePermission("app.settings");
  const { templates, version } = await templatesForEdit();
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Message templates</h2>
        <p className="text-sm text-muted-foreground">
          {
            "Picked when writing from a booking; {placeholders} are filled from the file, and a missing one shows —."
          }
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {templates.map((t) => (
          <TemplateEditor key={t.code} t={t} version={version} />
        ))}
        <TemplateEditor version={version} />
      </CardContent>
    </Card>
  );
}

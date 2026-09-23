import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "./page-header";

/**
 * Placeholder for an app not yet migrated. Names what the legacy app does here, so the
 * screen doubles as the migration checklist (docs/MIGRATION.md holds the full plan).
 */
export function ModulePending({
  title,
  legacy,
  scope,
}: {
  title: string;
  legacy: string;
  scope: string[];
}) {
  return (
    <>
      <PageHeader title={title} description="Not yet migrated — still served by the legacy app." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>What moves here</CardTitle>
          <CardDescription>Legacy source: {legacy}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {scope.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

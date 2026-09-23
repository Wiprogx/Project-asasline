import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HolidaysEditor } from "@/features/rules/components/holidays-editor";
import { holidaysForEdit } from "@/features/rules/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Public holidays" };

export default async function HolidaysPage() {
  await requirePagePermission("app.settings");
  const { value, version } = await holidaysForEdit();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Public holidays</CardTitle>
        <CardDescription>
          Not working days for deadlines: Belgium&apos;s always, a destination&apos;s for its own
          papers. Changing one re-plans every live booking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <HolidaysEditor holidays={value} version={version} />
      </CardContent>
    </Card>
  );
}

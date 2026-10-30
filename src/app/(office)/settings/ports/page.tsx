import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPort, PortTable } from "@/features/ports/components/port-editor";
import { PortFilters } from "@/features/ports/components/port-filters";
import { portRegionOptions, portsForEdit } from "@/features/ports/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Ports" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** The ports table (legacy PORTS): what every port field offers and every record points at. */
export default async function PortsPage({ searchParams }: PageProps<"/settings/ports">) {
  await requirePagePermission("app.settings");
  const sp = await searchParams;
  const scope = { q: one(sp.q), regionId: one(sp.region), archived: one(sp.archived) === "1" };
  const [rows, regions] = await Promise.all([portsForEdit(scope), portRegionOptions()]);
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1.5">
          <CardTitle>Ports</CardTitle>
          <CardDescription>
            Offered on every port field as you type; quotations, bookings, the catalogue and the
            sailings point at a port of this table. A code typed that is not here is added, to be
            completed. The destination country of a booking is read from its port code. Regions are
            a list of Settings › Lists.
          </CardDescription>
        </div>
        <AddPort regions={regions} />
      </CardHeader>
      <CardContent className="grid gap-4">
        <PortFilters scope={scope} regions={regions} />
        <p className="text-sm text-muted-foreground">
          {rows.length} port{rows.length === 1 ? "" : "s"}
        </p>
        <PortTable rows={rows} regions={regions} />
      </CardContent>
    </Card>
  );
}

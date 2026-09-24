import type { Metadata } from "next";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { may } from "@/domain/permissions";
import { CutoffForm } from "@/features/vessels/components/cutoff-form";
import { VesselForm } from "@/features/vessels/components/vessel-form";
import { VesselsTable } from "@/features/vessels/components/vessels-table";
import { cutoffRulesForEdit, listVessels } from "@/features/vessels/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Vessels" };

/** The vessel register: sailings the bookings ride on, and how far before the ETD each closing falls. */
export default async function VesselsPage({ searchParams }: PageProps<"/settings/vessels">) {
  const user = await requirePagePermission("bookings.edit");
  const { q } = await searchParams;
  const rows = await listVessels({
    q: typeof q === "string" ? q : undefined,
    today: officeToday(),
  });
  const cutoffs = may(user, "app.settings") ? await cutoffRulesForEdit() : null;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">New sailing</h2>
        </CardHeader>
        <CardContent>
          <VesselForm />
        </CardContent>
      </Card>
      <SearchInput placeholder="Search a vessel, voyage, carrier or port…" />
      <Card>
        <CardContent className="pt-2">
          <VesselsTable rows={rows} />
        </CardContent>
      </Card>
      {cutoffs && (
        <Card>
          <CardHeader>
            <h2 className="font-heading text-base font-medium">Closings</h2>
            <p className="text-sm text-muted-foreground">
              Each closing falls so many days before the sailing&apos;s ETD. Saving re-dates every
              booking on a sailing, and its document steps with it.
            </p>
          </CardHeader>
          <CardContent>
            <CutoffForm rules={cutoffs.rules} version={cutoffs.version} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

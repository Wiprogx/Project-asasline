import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { may } from "@/domain/permissions";
import { AddContainer } from "@/features/bookings/components/add-container";
import { ContainerRow } from "@/features/bookings/components/container-row";
import { VgmBadge } from "@/features/bookings/components/vgm-badge";
import { getBooking } from "@/features/bookings/queries";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";
import { readHsCodes } from "@/server/goods-config";
import { readLoadingGrace, readLoadingModes } from "@/server/loading-config";
import { cargoKgOf } from "@/domain/goods";
import { readBoxOwners, readContainerSpecs } from "@/server/container-config";
import { ownerOf, specsByType } from "@/domain/lookups";
import { loadingChecks } from "@/domain/loading-check";
import { ContainersReadOnly } from "@/features/bookings/components/containers-readonly";
import { chargeItems } from "@/features/quotations/charge-queries";
import { ExtraTimeCharges } from "@/features/quotations/components/extra-time-charges";

export const metadata: Metadata = { title: "Containers" };

export default async function ContainersPage({ params }: PageProps<"/bookings/[id]/containers">) {
  const user = await requirePagePermission("app.bookings");
  const { id } = await params;
  const [
    b,
    types,
    modes,
    truckers,
    packageTypes,
    hsCodes,
    specList,
    owners,
    sealSources,
    grace,
    items,
  ] = await Promise.all([
    getBooking(id),
    readConfig("containerTypes"),
    readLoadingModes(),
    contactOptions(),
    readConfig("packageTypes"),
    readHsCodes(),
    readContainerSpecs(),
    readBoxOwners(),
    readConfig("sealSources"),
    readLoadingGrace(),
    chargeItems(),
  ]);
  const specs = specsByType(specList);
  if (!b) notFound();
  const editable = may(user, "bookings.edit") && b.status !== "cancelled";
  // Each box measured against its mode (legacy loadingChecks).
  const checks = loadingChecks(b, b.containers, modes, grace);

  if (!editable) return <ContainersReadOnly boxes={b.containers} owners={owners} specs={specs} />;

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <AddContainer bookingId={b.id} types={types} />
      </div>
      {b.containers.map((c, i) => (
        <ContainerRow
          sealSources={sealSources}
          key={c.id}
          box={c}
          index={i}
          bookingId={b.id}
          types={types}
          modes={modes}
          truckers={truckers}
          hsCodes={hsCodes}
          packageTypes={packageTypes}
          canRemove={b.containers.length > 1}
        >
          {ownerOf(owners, c.number) && (
            <span className="text-xs text-muted-foreground">{ownerOf(owners, c.number)}</span>
          )}
          <VgmBadge type={c.type} cargoKg={cargoKgOf(c)} tareKg={c.tareKg} specs={specs} />
          {checks[i] && <span className="text-xs">{checks[i].message}</span>}
        </ContainerRow>
      ))}
      {b.quotation && b.quotationRouteId && (
        <ExtraTimeCharges
          checks={checks}
          file={{ quotation: b.quotation, routeId: b.quotationRouteId, bookingId: b.id }}
          items={items}
          canSeeCost={may(user, "costs.view")}
        />
      )}
    </div>
  );
}

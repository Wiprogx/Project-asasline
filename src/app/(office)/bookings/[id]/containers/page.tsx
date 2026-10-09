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
import { readLoadingModes } from "@/server/loading-config";
import { cargoKgOf } from "@/domain/goods";
import { readBoxOwners, readContainerSpecs } from "@/server/container-config";
import { ownerOf, specsByType } from "@/domain/lookups";

export const metadata: Metadata = { title: "Containers" };

export default async function ContainersPage({ params }: PageProps<"/bookings/[id]/containers">) {
  const user = await requirePagePermission("app.bookings");
  const { id } = await params;
  const [b, types, modes, truckers, packageTypes, hsCodes, specList, owners] = await Promise.all([
    getBooking(id),
    readConfig("containerTypes"),
    readLoadingModes(),
    contactOptions(),
    readConfig("packageTypes"),
    readHsCodes(),
    readContainerSpecs(),
    readBoxOwners(),
  ]);
  const specs = specsByType(specList);
  if (!b) notFound();
  const editable = may(user, "bookings.edit") && b.status !== "cancelled";

  if (!editable) {
    return (
      <div className="grid gap-2">
        {b.containers.map((c, i) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <span>
              #{i + 1} · {c.type} · <span className="font-mono">{c.number ?? "—"}</span>
              {ownerOf(owners, c.number) && (
                <span className="text-muted-foreground"> · {ownerOf(owners, c.number)}</span>
              )}
              {c.loadingMode && <span className="text-muted-foreground"> · {c.loadingMode}</span>}
            </span>
            <VgmBadge type={c.type} cargoKg={cargoKgOf(c)} tareKg={c.tareKg} specs={specs} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <AddContainer bookingId={b.id} types={types} />
      </div>
      {b.containers.map((c, i) => (
        <ContainerRow
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
        </ContainerRow>
      ))}
    </div>
  );
}

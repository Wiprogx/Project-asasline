import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadingChecks } from "@/domain/loading-check";
import { specsByType } from "@/domain/lookups";
import { may } from "@/domain/permissions";
import { ContainerList } from "@/features/bookings/components/container-list";
import { ContainersReadOnly } from "@/features/bookings/components/containers-readonly";
import { bookingPlaces } from "@/features/bookings/place-queries";
import { getBooking } from "@/features/bookings/queries";
import { NewPlaceDialog } from "@/features/contacts/components/new-place-dialog";
import { placesOf } from "@/features/contacts/place-queries";
import { contactOptions } from "@/features/contacts/queries";
import { chargeItems } from "@/features/quotations/charge-queries";
import { ExtraTimeCharges } from "@/features/quotations/components/extra-time-charges";
import { requirePagePermission } from "@/server/auth/dal";
import { readBoxOwners, readContainerSpecs } from "@/server/container-config";
import { readCountries } from "@/server/countries";
import { readHsCodes } from "@/server/goods-config";
import { readLoadingGrace, readLoadingModes } from "@/server/loading-config";
import { liveLookups } from "@/server/lookups";

export const metadata: Metadata = { title: "Containers" };

export default async function ContainersPage({ params }: PageProps<"/bookings/[id]/containers">) {
  const user = await requirePagePermission("app.bookings");
  const { id } = await params;
  const [b, types, modes, truckers, packageTypes, hsCodes, specList, owners, sealSources] =
    await Promise.all([
      getBooking(id),
      liveLookups("container-types").then((o) => o.map((x) => x.label)),
      readLoadingModes(),
      contactOptions(),
      liveLookups("package-types").then((o) => o.map((x) => x.label)),
      readHsCodes(),
      readContainerSpecs(),
      readBoxOwners(),
      liveLookups("seal-sources").then((o) => o.map((x) => x.label)),
    ]);
  if (!b) notFound();
  const [grace, items, rolePlaces, customer, countries, salutations] = await Promise.all([
    readLoadingGrace(),
    chargeItems(),
    bookingPlaces(),
    placesOf(b.clientId),
    readCountries(),
    liveLookups("salutations"),
  ]);
  const specs = specsByType(specList);
  const editable = may(user, "bookings.edit") && b.status !== "cancelled";
  // Each box measured against its mode (legacy loadingChecks).
  const checks = loadingChecks(b, b.containers, modes, grace);

  if (!editable) return <ContainersReadOnly boxes={b.containers} owners={owners} specs={specs} />;

  // Where a box may be loaded: the customer's places first, the booking's proposal filled in.
  const places = {
    customer,
    locations: rolePlaces.locations,
    clientId: b.clientId,
    proposed: b.loadAddressId,
    newPlace: <NewPlaceDialog lists={{ countries, salutations }} />,
  };
  const lists = {
    types,
    modes,
    truckers,
    hsCodes,
    packageTypes,
    sealSources,
    owners,
    specs,
    places,
  };

  return (
    <div className="grid gap-3">
      <ContainerList
        bookingId={b.id}
        boxes={b.containers}
        lists={lists}
        notes={checks.map((c) => c?.message ?? null)}
      />
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

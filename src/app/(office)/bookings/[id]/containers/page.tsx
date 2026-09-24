import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { may } from "@/domain/permissions";
import { AddContainer } from "@/features/bookings/components/add-container";
import { ContainerRow } from "@/features/bookings/components/container-row";
import { VgmBadge } from "@/features/bookings/components/vgm-badge";
import { getBooking } from "@/features/bookings/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";

export const metadata: Metadata = { title: "Containers" };

export default async function ContainersPage({ params }: PageProps<"/bookings/[id]/containers">) {
  const user = await requirePagePermission("app.bookings");
  const { id } = await params;
  const [b, types] = await Promise.all([getBooking(id), readConfig("containerTypes")]);
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
            </span>
            <VgmBadge type={c.type} cargoKg={c.cargoKg} tareKg={c.tareKg} />
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
          canRemove={b.containers.length > 1}
        >
          <VgmBadge type={c.type} cargoKg={c.cargoKg} tareKg={c.tareKg} />
        </ContainerRow>
      ))}
    </div>
  );
}

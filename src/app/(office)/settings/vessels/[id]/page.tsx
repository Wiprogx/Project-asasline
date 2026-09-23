import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VesselForm } from "@/features/vessels/components/vessel-form";
import { getVessel } from "@/features/vessels/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Sailing" };

/** One sailing: change it, and every live booking on it moves with it. */
export default async function VesselPage({ params }: PageProps<"/settings/vessels/[id]">) {
  await requirePagePermission("bookings.edit");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const found = await getVessel(id.data);
  if (!found) notFound();
  const { vessel: v, bookings } = found;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">
            {v.name} · {v.voyage}
          </h2>
          <p className="text-sm text-muted-foreground">
            Saving moves the bookings on this sailing: ETD, ETA, closings and their document steps.
          </p>
        </CardHeader>
        <CardContent>
          <VesselForm values={v} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Bookings on it ({bookings.length})</h2>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link className="font-mono hover:underline" href={`/bookings/${b.id}`}>
                    {b.ref}
                  </Link>{" "}
                  · {b.client ?? "—"} · {b.status}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { may } from "@/domain/permissions";
import { VesselTrack } from "@/features/vessels/components/vessel-track";
import { getVessel } from "@/features/vessels/queries";
import { requirePagePermission } from "@/server/auth/dal";

export async function generateMetadata({ params }: PageProps<"/vessels/[id]">): Promise<Metadata> {
  const id = z.uuid().safeParse((await params).id);
  const found = id.success ? await getVessel(id.data) : null;
  return { title: found ? `${found.vessel.name} · ${found.vessel.voyage}` : "Sailing" };
}

/** Track one sailing (legacy trackVessel); the register is where its schedule is changed. */
export default async function VesselTrackPage({ params }: PageProps<"/vessels/[id]">) {
  const user = await requirePagePermission("app.bookings");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const found = await getVessel(id.data);
  if (!found) notFound();
  const { vessel: v, bookings } = found;
  return (
    <>
      <PageHeader
        title={`${v.name} · ${v.voyage}`}
        description="The ship, its schedule and every booking on it"
        actions={
          may(user, "bookings.edit") && (
            <Link
              href={`/settings/vessels/${v.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Update schedule
            </Link>
          )
        }
      />
      <VesselTrack vessel={v} bookings={bookings} />
    </>
  );
}

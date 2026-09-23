"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import {
  bookings,
  containers,
  quotationLines,
  quotationRoutes,
  quotations,
} from "@/server/db/schema";
import { nextRef } from "@/server/sequences";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { newQuotationSchema, quotationRef } from "./schemas";

export async function createQuotation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.quotations");
  const parsed = newQuotationSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;

  const id = await db.transaction(async (tx) => {
    const ref = await nextRef(tx, "QT", officeToday());
    const [q] = await tx
      .insert(quotations)
      .values({
        ref,
        clientId: d.clientId,
        validUntil: d.validUntil,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: quotations.id });
    const [route] = await tx
      .insert(quotationRoutes)
      .values({
        quotationId: q.id,
        pol: d.pol.toUpperCase(),
        pod: d.pod.toUpperCase(),
        finalPlace: d.finalPlace,
        containerType: d.containerType,
        createdBy: user.id,
      })
      .returning({ id: quotationRoutes.id });
    await tx.insert(quotationLines).values({
      routeId: route.id,
      description: d.description,
      sellCents: d.sell,
      costCents: d.cost ?? null,
      vatCode: d.vatCode,
      priceSource: "manual",
      createdBy: user.id,
    });
    await audit(tx, {
      action: "quotation.create",
      userId: user.id,
      entity: "quotation",
      entityId: q.id,
      detail: { ref },
    });
    return q.id;
  });
  await invalidateTags(tags.quotations);
  revalidatePath("/quotations");
  redirect(`/quotations/${id}`);
}

/**
 * Accepting creates the booking. The booking reads its price from the quotation (one source
 * of truth, invariant 2), so nothing about the price is copied — only who and where.
 */
export async function acceptQuotation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = quotationRef.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;

  let bookingId: string;
  try {
    bookingId = await db.transaction(async (tx) => {
      const q = await tx.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { routes: { where: and(eq(quotationRoutes.declined, false)) } },
      });
      if (!q || q.status === "accepted" || q.status === "cancelled")
        throw new ConflictError("This quotation");
      const route = q.routes[0];
      if (!route) throw new Error("A quotation needs at least one route that was not declined.");
      await updateVersioned(
        tx,
        quotations,
        id,
        version,
        { status: "accepted", updatedBy: user.id },
        "This quotation",
      );
      const ref = await nextRef(tx, "SB", officeToday());
      const [b] = await tx
        .insert(bookings)
        .values({
          ref,
          quotationId: id,
          clientId: q.clientId,
          payerId: q.clientId,
          pol: route.pol,
          pod: route.pod,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning({ id: bookings.id });
      await tx
        .insert(containers)
        .values({ bookingId: b.id, type: route.containerType ?? "40HC", createdBy: user.id });
      await audit(tx, {
        action: "quotation.accept",
        userId: user.id,
        entity: "quotation",
        entityId: id,
        detail: { booking: ref },
      });
      return b.id;
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await invalidateTags(tags.quotations, tags.bookings, tags.dashboard);
  revalidatePath("/quotations");
  revalidatePath("/bookings");
  redirect(`/bookings/${bookingId}`);
}

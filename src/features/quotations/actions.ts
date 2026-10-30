"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
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
  contacts,
  containers,
  quotationLines,
  quotationRoutes,
  quotations,
} from "@/server/db/schema";
import { liveLookupIdByLabel, lookupIdByCode } from "@/server/lookups";
import { portId, withPorts } from "@/server/ports";
import { syncBookingRules } from "@/server/rules-sync";
import { DEFAULT_CONTAINER_TYPE, DEFAULT_DOC_TYPE } from "@/domain/lookup-tables";
import { nextRef } from "@/server/sequences";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { acceptRouteSchema, newQuotationSchema } from "./schemas";
import { Refused } from "./editor-store";
import { openAutoTask } from "@/server/auto-tasks";

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
        kind: d.kind,
        validUntil: d.validUntil,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: quotations.id });
    const [route] = await tx
      .insert(quotationRoutes)
      .values({
        quotationId: q.id,
        polId: await portId(tx, d.pol, user.id),
        podId: await portId(tx, d.pod, user.id),
        finalPlace: d.finalPlace,
        containerTypeId: d.containerType
          ? await liveLookupIdByLabel(tx, "container-types", d.containerType)
          : null,
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
    const [client] = await tx
      .select({ name: contacts.name })
      .from(contacts)
      .where(eq(contacts.id, d.clientId));
    await openAutoTask(tx, {
      trigger: "quote_created",
      vars: { ref, client: client?.name ?? "the customer" },
      link: { kind: "quotation", id: q.id },
      userId: user.id,
      today: officeToday(),
    });
    return q.id;
  });
  await invalidateTags(tags.quotations);
  revalidatePath("/quotations");
  redirect(`/quotations/${id}`);
}

/**
 * Accepting a destination creates its booking (legacy b.routeId: each destination of a
 * quotation ships as its own booking). The booking reads its price from that route's lines
 * (one source of truth, invariant 2), so nothing about the price is copied — only who and where.
 */
export async function acceptQuotation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("bookings.edit");
  const parsed = acceptRouteSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, routeId } = parsed.data;

  let bookingId: string;
  try {
    bookingId = await db.transaction(async (tx) => {
      const q = await tx.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { routes: { where: eq(quotationRoutes.id, routeId) } },
      });
      if (!q || q.status === "cancelled") throw new ConflictError("This quotation");
      const route = q.routes[0];
      if (!route || route.declined || route.archivedAt)
        throw new Refused("This destination was declined; put it back before booking it.");
      const [booked] = await tx
        .select({ ref: bookings.ref })
        .from(bookings)
        .where(
          and(
            eq(bookings.quotationRouteId, routeId),
            ne(bookings.status, "cancelled"),
            isNull(bookings.archivedAt),
          ),
        );
      if (booked) throw new Refused(`This destination is already booked as ${booked.ref}.`);
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
          quotationRouteId: routeId,
          kind: q.kind,
          clientId: q.clientId,
          payerId: q.clientId,
          polId: route.polId,
          podId: route.podId,
          loadingMode: route.loadingMode,
          commodity: q.commodity,
          docTypeId: q.docTypeId ?? (await lookupIdByCode(tx, "doc-types", DEFAULT_DOC_TYPE)),
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning({ id: bookings.id });
      const [named] = await withPorts([route]);
      // As many boxes as the destination was quoted for (legacy expectedBoxes); else 40HC.
      const defaultBox = await lookupIdByCode(tx, "container-types", DEFAULT_CONTAINER_TYPE);
      await tx.insert(containers).values(
        Array.from({ length: Math.max(1, route.boxes) }, (_, position) => ({
          bookingId: b.id,
          typeId: route.containerTypeId ?? defaultBox,
          position,
          createdBy: user.id,
        })),
      );
      await audit(tx, {
        action: "quotation.accept",
        userId: user.id,
        entity: "quotation",
        entityId: id,
        detail: { booking: ref, route: `${named.pol} → ${named.pod}` },
      });
      await syncBookingRules(tx, b.id, user.id);
      const [client] = await tx
        .select({ name: contacts.name })
        .from(contacts)
        .where(eq(contacts.id, q.clientId));
      await openAutoTask(tx, {
        trigger: "booking_created",
        vars: { ref, client: client?.name ?? "the customer" },
        link: { kind: "booking", id: b.id },
        userId: user.id,
        today: officeToday(),
      });
      return b.id;
    });
  } catch (e) {
    if (e instanceof ConflictError || e instanceof Refused) return fail(e.message);
    throw e;
  }
  await invalidateTags(tags.quotations, tags.bookings, tags.dashboard);
  revalidatePath("/quotations");
  revalidatePath("/bookings");
  redirect(`/bookings/${bookingId}`);
}

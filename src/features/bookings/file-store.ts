import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { itemLabel } from "@/domain/pricing";
import { countryOfPort } from "@/domain/rules/engine";
import type { DbOrTx } from "@/server/db/client";
import { activities, bookingFiles, rateItems } from "@/server/db/schema";
import { syncBookingRules } from "@/server/rules-sync";

// Internal to the booking's files: the actions and queries call these after their permission check.

/**
 * A final paper filed against a document step settles it (legacy: the CMR closes the loading
 * step, the certificate the Certiweight step): the open task is done, and the chain re-plans
 * so what waited on it opens. Returns whether a step was settled.
 */
export async function settleStep(tx: DbOrTx, bookingId: string, ruleCode: string, userId: string) {
  const rows = await tx
    .update(activities)
    .set({
      state: "done",
      doneAt: new Date(),
      doneBy: userId,
      version: sql`${activities.version} + 1`,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(
      and(
        eq(activities.linkKind, "booking"),
        eq(activities.linkId, bookingId),
        eq(activities.ruleCode, ruleCode),
        eq(activities.state, "open"),
      ),
    )
    .returning({ id: activities.id });
  if (rows.length === 0) return false;
  await syncBookingRules(tx, bookingId, userId);
  return true;
}

/** The files still on the booking, newest first. */
export function liveFiles(tx: DbOrTx, bookingId: string) {
  return tx
    .select()
    .from(bookingFiles)
    .where(and(eq(bookingFiles.bookingId, bookingId), isNull(bookingFiles.archivedAt)))
    .orderBy(sql`${bookingFiles.createdAt} desc`);
}

/** The papers the destination country asks for: the catalogue's document items for it. */
export async function destinationDocs(tx: DbOrTx, pod: string | null) {
  const country = countryOfPort(pod);
  if (!country) return [];
  const rows = await tx
    .select()
    .from(rateItems)
    .where(
      and(
        eq(rateItems.category, "docs"),
        eq(rateItems.country, country),
        isNull(rateItems.archivedAt),
      ),
    );
  return rows
    .filter((r) => r.docCode)
    .map((r) => ({ code: r.docCode!.toUpperCase(), label: itemLabel(r) }));
}

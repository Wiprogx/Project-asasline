"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db, type DbOrTx } from "@/server/db/client";
import { countries, ports } from "@/server/db/schema";
import { invalidatePorts } from "@/server/ports";
import { ConflictError, updateVersioned } from "@/server/versioned";
import {
  archivePortSchema,
  createPortSchema,
  restorePortSchema,
  updatePortSchema,
} from "./schemas";

const LABEL = "This port";
const COUNTRY_UNKNOWN = "This country is not in Settings › Countries.";

const countryKnown = async (tx: DbOrTx, code: string) =>
  (await tx.select({ code: countries.code }).from(countries).where(eq(countries.code, code)))
    .length > 0;

/** Postgres' unique violation, whether thrown as is or wrapped by Drizzle (its `cause`). */
const isUniqueViolation = (e: unknown): boolean =>
  typeof e === "object" &&
  e !== null &&
  (("code" in e && e.code === "23505") || ("cause" in e && isUniqueViolation(e.cause)));

/** Runs the write; a refusal, a code already in the table or a colleague's newer save is the answer. */
async function settle(message: string, write: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const refused = await write();
    if (refused) return fail(refused);
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    if (isUniqueViolation(e)) return fail("This UN/LOCODE is already in the table.");
    throw e;
  }
  await invalidatePorts();
  revalidatePath("/settings/ports");
  return { ok: true, data: undefined, message };
}

export async function createPort(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = createPortSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const port = parsed.data;
  return settle(`Added · ${port.code} ${port.name}`, () =>
    db.transaction(async (tx) => {
      if (!(await countryKnown(tx, port.country))) return COUNTRY_UNKNOWN;
      const [row] = await tx
        .insert(ports)
        .values({ ...port, createdBy: user.id, updatedBy: user.id })
        .returning({ id: ports.id });
      await audit(tx, {
        action: "port.create",
        userId: user.id,
        entity: "port",
        entityId: row.id,
        detail: { code: port.code },
      });
    }),
  );
}

/** Its code stays; every record that names the port reads the new name and details. */
export async function updatePort(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = updatePortSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  return settle("Saved", () =>
    db.transaction(async (tx) => {
      const [before] = await tx.select().from(ports).where(eq(ports.id, id));
      if (!before) throw new ConflictError(LABEL);
      if (!(await countryKnown(tx, fields.country))) return COUNTRY_UNKNOWN;
      if (!before.code.startsWith(fields.country))
        return `${before.code} is a port of ${before.code.slice(0, 2)}: its country stays.`;
      await updateVersioned(tx, ports, id, version, { ...fields, updatedBy: user.id }, LABEL);
      await audit(tx, {
        action: "port.update",
        userId: user.id,
        entity: "port",
        entityId: id,
        detail: { code: before.code, from: before.name, to: fields.name },
      });
    }),
  );
}

/** No longer offered on the port fields, never deleted: the records that name it keep it. */
export async function archivePort(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = archivePortSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  return settle("Archived — no longer offered", () =>
    db.transaction(async (tx) => {
      const archived = { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason };
      await updateVersioned(tx, ports, id, version, { ...archived, updatedBy: user.id }, LABEL);
      await audit(tx, {
        action: "port.archive",
        userId: user.id,
        entity: "port",
        entityId: id,
        detail: { reason },
      });
    }),
  );
}

export async function restorePort(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = restorePortSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;
  return settle("Offered again", () =>
    db.transaction(async (tx) => {
      const back = { archivedAt: null, archivedBy: null, archivedReason: null, updatedBy: user.id };
      await updateVersioned(tx, ports, id, version, back, LABEL);
      await audit(tx, { action: "port.restore", userId: user.id, entity: "port", entityId: id });
    }),
  );
}

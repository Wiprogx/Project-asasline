"use server";

import { z } from "zod";
import { parseBoxOwnerLines, parseContainerSpecLines } from "@/domain/lookups";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import {
  BOX_OWNERS_TAG,
  boxOwnersSchema,
  CONTAINER_SPECS_TAG,
  containerSpecsSchema,
} from "@/server/container-config";
import { saveTable, versioned } from "./table-store";
import { parseIdFormatLines } from "@/domain/contacts";
import { ID_FORMATS_TAG, idFormatsSchema } from "@/server/id-config";
import { LOADING_GRACE_TAG, loadingGraceSchema } from "@/server/loading-config";
import { parseLineItemLines } from "@/domain/line-items";
import { LINE_ITEMS_TAG, lineItemsSchema } from "@/server/line-items-config";

/** Box owners, one per line as "MSCU | MSC". */
export async function saveBoxOwners(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(50_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { owners, problems } = parseBoxOwnerLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = boxOwnersSchema.safeParse(owners);
  if (!checked.success) return fail("Five hundred prefixes at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "boxOwners",
    value: checked.data,
    version: parsed.data.version,
    tag: BOX_OWNERS_TAG,
    path: "/settings/containers",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} box owners` };
}

/** Container specs, one per line as "40HC | 3900 | 32500". */
export async function saveContainerSpecs(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { specs, problems } = parseContainerSpecLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = containerSpecsSchema.safeParse(specs);
  if (!checked.success) return fail("At least one type, sixty at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "containerSpecs",
    value: checked.data,
    version: parsed.data.version,
    tag: CONTAINER_SPECS_TAG,
    path: "/settings/containers",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} container types` }
  );
}

/** VAT and EORI formats, one per line as "BE | vat | ^BE0\\d{9}$ | BE + 10 digits, the first a 0 | BE0464648410". */
export async function saveIdFormats(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(50_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { formats, problems } = parseIdFormatLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = idFormatsSchema.safeParse(formats);
  if (!checked.success) return fail("Two hundred formats at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "idFormats",
    value: checked.data,
    version: parsed.data.version,
    tag: ID_FORMATS_TAG,
    path: "/settings/id-formats",
    detail: { count: checked.data.length },
  });
  return (
    bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} number formats` }
  );
}

/** The general line items (legacy GL_ITEMS and SALE_ITEMS): id, kind, name, account, VAT. */
export async function saveLineItems(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(50_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { items, problems } = parseLineItemLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = lineItemsSchema.safeParse(items);
  if (!checked.success) return fail("Two hundred items at most.");
  const bad = await saveTable({
    userId: user.id,
    name: "lineItems",
    value: checked.data,
    version: parsed.data.version,
    tag: LINE_ITEMS_TAG,
    path: "/settings/line-items",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} line items` };
}

/** The grace before waiting time is billable, in minutes (legacy LOADING_GRACE_H). */
export async function saveLoadingGrace(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(20) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const minutes = Number(parsed.data.lines.trim());
  const checked = loadingGraceSchema.safeParse({ minutes });
  if (!checked.success) return fail("The grace in whole minutes, 0 to 240.");
  const bad = await saveTable({
    userId: user.id,
    name: "loadingGrace",
    value: checked.data,
    version: parsed.data.version,
    tag: LOADING_GRACE_TAG,
    path: "/settings/loading",
    detail: checked.data,
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${minutes} minutes of grace` };
}

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
import { parseCountryLines } from "@/domain/countries";
import { COUNTRIES_TAG, countriesSchema } from "@/server/country-config";

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

/** The countries table (legacy Settings › Countries): code, name, dial code and language. */
export async function saveCountries(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(50_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { countries, problems } = parseCountryLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = countriesSchema.safeParse(countries);
  if (!checked.success) return fail("Between one and three hundred countries.");
  const bad = await saveTable({
    userId: user.id,
    name: "countries",
    value: checked.data,
    version: parsed.data.version,
    tag: COUNTRIES_TAG,
    path: "/settings/countries",
    detail: { count: checked.data.length },
  });
  return bad ?? { ok: true, data: undefined, message: `Saved · ${checked.data.length} countries` };
}

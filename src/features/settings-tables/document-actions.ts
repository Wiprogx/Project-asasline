"use server";

import { z } from "zod";
import { QUOTE_FIELD_KEYS } from "@/domain/quote-fields";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { QUOTE_FIELDS_TAG, quoteFieldsSchema } from "@/server/quote-fields-config";
import { saveTable, versioned } from "./table-store";

const schema = versioned.extend(
  Object.fromEntries(QUOTE_FIELD_KEYS.map((k) => [k, z.string().optional()])) as Record<
    (typeof QUOTE_FIELD_KEYS)[number],
    z.ZodOptional<z.ZodString>
  >,
);

/** What the printed quotation shows: a checkbox per part (legacy QUOTE_FIELDS). */
export async function saveQuoteFields(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = schema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const fields = Object.fromEntries(QUOTE_FIELD_KEYS.map((k) => [k, parsed.data[k] === "on"]));
  const checked = quoteFieldsSchema.safeParse(fields);
  if (!checked.success) return fail("The switches do not read right.");
  const bad = await saveTable({
    userId: user.id,
    name: "quoteFields",
    value: checked.data,
    version: parsed.data.version,
    tag: QUOTE_FIELDS_TAG,
    path: "/settings/quotation-document",
    detail: { on: QUOTE_FIELD_KEYS.filter((k) => checked.data[k]) },
  });
  return bad ?? { ok: true, data: undefined, message: "Saved — the printed quotation" };
}

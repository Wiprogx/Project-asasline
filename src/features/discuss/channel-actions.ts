"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AUTO_CHANNELS, parseWhatsAppLines } from "@/domain/channels";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags } from "@/server/cache/cache";
import {
  AUTO_SEND_NAME,
  AUTO_SEND_TAG,
  autoSendSchema,
  WHATSAPP_NAME,
  WHATSAPP_TAG,
  whatsAppNumbersSchema,
} from "@/server/channel-config";
import { writeTable } from "@/server/config-tables";
import { db } from "@/server/db/client";
import { ConflictError } from "@/server/versioned";

const versioned = z.object({ version: z.coerce.number().int().min(0) });

const autoSendForm = versioned.extend({
  enabled: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  channel: z.enum(AUTO_CHANNELS),
});

/** Writes one Settings value against the version read; a stale write is the form's error. */
async function store(
  name: string,
  value: unknown,
  version: number,
  userId: string,
  tag: string,
  detail: Record<string, unknown>,
): Promise<ActionResult | null> {
  try {
    await db.transaction(async (tx) => {
      await writeTable(tx, name, value, version, userId);
      await audit(tx, {
        action: `config.${name}`,
        userId,
        entity: "config",
        entityId: name,
        detail,
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) return fail(e.message);
    throw e;
  }
  await invalidateTags(tag);
  revalidatePath("/settings/routing");
  return null;
}

/** Whether tracking news goes out by itself, and by which channel (legacy AUTO_SEND). */
export async function saveAutoSend(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = autoSendForm.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const value = autoSendSchema.parse({
    enabled: parsed.data.enabled,
    channel: parsed.data.channel,
  });
  const bad = await store(
    AUTO_SEND_NAME,
    value,
    parsed.data.version,
    user.id,
    AUTO_SEND_TAG,
    value,
  );
  return (
    bad ?? {
      ok: true,
      data: undefined,
      message: value.enabled ? "Tracking news goes out by itself" : "Nothing goes out by itself",
    }
  );
}

/** The WhatsApp numbers the office writes from (legacy WA_NUMBERS): one active at a time. */
export async function saveWhatsAppNumbers(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.settings");
  const parsed = versioned.extend({ lines: z.string().max(5_000) }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { numbers, problems } = parseWhatsAppLines(parsed.data.lines);
  if (problems.length) return fail(problems.slice(0, 3).join(" · "));
  const checked = whatsAppNumbersSchema.safeParse(numbers);
  if (!checked.success) return fail("Twenty numbers at most.");
  const bad = await store(WHATSAPP_NAME, checked.data, parsed.data.version, user.id, WHATSAPP_TAG, {
    count: checked.data.length,
  });
  return (
    bad ?? {
      ok: true,
      data: undefined,
      message: `Saved · ${checked.data.length} WhatsApp numbers`,
    }
  );
}

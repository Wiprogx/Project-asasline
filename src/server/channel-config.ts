import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  activeNumber,
  AUTO_CHANNELS,
  type AutoSend,
  DEFAULT_AUTO_SEND,
  DEFAULT_WHATSAPP_NUMBERS,
  type WhatsAppNumber,
} from "@/domain/channels";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

export const AUTO_SEND_NAME = "autoSend";
export const AUTO_SEND_TAG = `config:${AUTO_SEND_NAME}`;
export const WHATSAPP_NAME = "whatsappNumbers";
export const WHATSAPP_TAG = `config:${WHATSAPP_NAME}`;

export const autoSendSchema = z.object({
  enabled: z.boolean(),
  channel: z.enum(AUTO_CHANNELS),
});

export const whatsAppNumbersSchema = z
  .array(
    z.object({
      label: z.string().min(1).max(60),
      number: z.string().min(6).max(25),
      phoneId: z.string().regex(/^\d{0,30}$/),
      active: z.boolean(),
    }),
  )
  .max(20);

/** Whether tracking news goes out by itself, and on which channel (legacy AUTO_SEND). */
export const readAutoSend = () =>
  cached(
    AUTO_SEND_NAME,
    { ttlSeconds: 600, tags: [AUTO_SEND_TAG] },
    async (): Promise<AutoSend> => {
      const [row] = await db
        .select()
        .from(configTables)
        .where(eq(configTables.name, AUTO_SEND_NAME));
      const parsed = row ? autoSendSchema.safeParse(row.value) : null;
      return parsed?.success ? parsed.data : { ...DEFAULT_AUTO_SEND };
    },
  );

/** The WhatsApp numbers the office writes from (legacy WA_NUMBERS). */
export const readWhatsAppNumbers = () =>
  cached(
    WHATSAPP_NAME,
    { ttlSeconds: 600, tags: [WHATSAPP_TAG] },
    async (): Promise<WhatsAppNumber[]> => {
      const [row] = await db
        .select()
        .from(configTables)
        .where(eq(configTables.name, WHATSAPP_NAME));
      const parsed = row ? whatsAppNumbersSchema.safeParse(row.value) : null;
      return parsed?.success ? parsed.data : DEFAULT_WHATSAPP_NUMBERS.map((n) => ({ ...n }));
    },
  );

/** The number a WhatsApp message goes out from (legacy waMain), or null when none is listed. */
export const activeWhatsApp = async () => activeNumber(await readWhatsAppNumbers());

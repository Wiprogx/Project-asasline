import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_PORTS, type Port, PORT_CODE } from "@/domain/ports";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "ports";
export const PORTS_TAG = `config:${NAME}`;

export const portsSchema = z
  .array(
    z.object({
      code: z.string().regex(PORT_CODE),
      name: z.string().min(1).max(80),
      country: z.string().regex(/^[A-Z]{2}$/),
    }),
  )
  .min(1)
  .max(2000);

/** The ports table (legacy PORTS): suggested on every port field, never a restriction. */
export function readPorts(): Promise<Port[]> {
  return cached(NAME, { ttlSeconds: 600, tags: [PORTS_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? portsSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : DEFAULT_PORTS;
  });
}

export async function readPortsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? portsSchema.safeParse(row.value) : null;
  return { ports: parsed?.success ? parsed.data : DEFAULT_PORTS, version: row?.version ?? 0 };
}

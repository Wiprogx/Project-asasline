import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_ESCALATE_MINUTES, DEFAULT_ROUTES, type Route } from "@/domain/messages";
import { ROLES } from "@/domain/permissions";
import { DEFAULT_TEMPLATES, TEMPLATE_CHANNELS, type Template } from "@/domain/templates";
import { cached } from "./cache/cache";
import { db, type DbOrTx } from "./db/client";
import { bookings, configTables, quotations } from "./db/schema";

const routeSchema = z.array(
  z.object({ code: z.string(), subject: z.string(), role: z.enum(ROLES), active: z.boolean() }),
);

/** The routing table (topic → role), a Settings table with the legacy rows as default. */
export function readRoutes(): Promise<Route[]> {
  return cached("config:routes", { ttlSeconds: 600, tags: ["config:routes"] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, "routes"));
    const parsed = row ? routeSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : DEFAULT_ROUTES;
  });
}

const escalationSchema = z.object({ minutes: z.number().int().min(5).max(1440) });

/** Minutes a message may wait unclaimed before the Team lead sees it too (a Settings value). */
export function readEscalateMinutes(): Promise<number> {
  return cached("config:escalation", { ttlSeconds: 600, tags: ["config:routes"] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, "escalation"));
    const parsed = row ? escalationSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data.minutes : DEFAULT_ESCALATE_MINUTES;
  });
}

/** An SB/QT number → the record it names, or null when nothing carries it. */
export async function resolveRef(
  tx: DbOrTx,
  ref: string | null | undefined,
): Promise<{ kind: "booking" | "quotation"; id: string; ref: string } | null> {
  if (!ref) return null;
  const r = ref.toUpperCase();
  if (r.startsWith("SB")) {
    const [b] = await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.ref, r));
    return b ? { kind: "booking", id: b.id, ref: r } : null;
  }
  if (r.startsWith("QT")) {
    const [q] = await tx
      .select({ id: quotations.id })
      .from(quotations)
      .where(eq(quotations.ref, r));
    return q ? { kind: "quotation", id: q.id, ref: r } : null;
  }
  return null;
}

const templatesSchema = z.array(
  z.object({
    code: z.string(),
    name: z.string(),
    channel: z.enum(TEMPLATE_CHANNELS),
    subject: z.string(),
    body: z.string(),
    active: z.boolean(),
  }),
);

/** The message templates (a Settings table with the legacy letters as default). */
export function readTemplates(): Promise<Template[]> {
  return cached("config:templates", { ttlSeconds: 600, tags: ["config:templates"] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, "templates"));
    const parsed = row ? templatesSchema.safeParse(row.value) : null;
    if (!parsed?.success) return DEFAULT_TEMPLATES;
    // A letter added to the defaults later still reaches an office that saved its table before.
    const missing = DEFAULT_TEMPLATES.filter((d) => !parsed.data.some((t) => t.code === d.code));
    return [...parsed.data, ...missing];
  });
}

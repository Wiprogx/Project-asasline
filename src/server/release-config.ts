import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  DEFAULT_RELEASE_STATES,
  DEFAULT_SEND_MODES,
  DEFAULT_TRACK_STEPS,
  type ReleaseState,
  type SendMode,
  type TrackStepDef,
} from "@/domain/release";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

/** Three small Settings tables of the same shape: a name, a schema, a default. */
type Table<T> = { name: string; schema: z.ZodType<T[]>; fallback: () => T[] };

export const releaseStatesSchema = z
  .array(
    z.object({
      code: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/),
      label: z.string().trim().min(1).max(60),
      hold: z.boolean(),
      hint: z.string().max(200),
    }),
  )
  .min(1)
  .max(20);

export const sendModesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(60),
      tracks: z.boolean(),
      url: z.string().url().max(300).nullable(),
    }),
  )
  .min(1)
  .max(30);

export const trackStepsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(60),
      source: z.enum(["auto", "manual"]),
      template: z
        .string()
        .regex(/^[A-Z][A-Z0-9_]{1,29}$/)
        .optional(),
    }),
  )
  .min(1)
  .max(30);

const RELEASE: Table<ReleaseState> = {
  name: "releaseStates",
  schema: releaseStatesSchema,
  fallback: () => DEFAULT_RELEASE_STATES.map((s) => ({ ...s })),
};
const SEND: Table<SendMode> = {
  name: "sendModes",
  schema: sendModesSchema,
  fallback: () => DEFAULT_SEND_MODES.map((m) => ({ ...m })),
};
const TRACK: Table<TrackStepDef> = {
  name: "trackSteps",
  schema: trackStepsSchema,
  fallback: () => DEFAULT_TRACK_STEPS.map((s) => ({ ...s })),
};

export const RELEASE_STATES_TAG = `config:${RELEASE.name}`;
export const SEND_MODES_TAG = `config:${SEND.name}`;
export const TRACK_STEPS_TAG = `config:${TRACK.name}`;

async function readForEdit<T>(t: Table<T>) {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, t.name));
  const parsed = row ? t.schema.safeParse(row.value) : null;
  return { rows: parsed?.success ? parsed.data : t.fallback(), version: row?.version ?? 0 };
}

const read = <T>(t: Table<T>) =>
  cached(t.name, { ttlSeconds: 600, tags: [`config:${t.name}`] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, t.name));
    const parsed = row ? t.schema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : t.fallback();
  });

export const readReleaseStates = () => read(RELEASE);
export const readSendModes = () => read(SEND);
export const readTrackSteps = () => read(TRACK);
export const readReleaseStatesForEdit = () => readForEdit(RELEASE);
export const readSendModesForEdit = () => readForEdit(SEND);
export const readTrackStepsForEdit = () => readForEdit(TRACK);

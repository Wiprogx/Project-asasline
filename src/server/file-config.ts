import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_FILE_HINTS, type FileHint } from "@/domain/files";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "fileHints";
export const FILE_HINTS_TAG = `config:${NAME}`;

export const fileHintsSchema = z
  .array(
    z.object({
      words: z.string().trim().min(1).max(200),
      code: z
        .string()
        .trim()
        .regex(/^[A-Z][A-Z0-9_]{1,29}$/),
    }),
  )
  .max(100);

/** The filing rules (legacy FILE_HINTS): words in a file's name → its code. A Settings table. */
export function readFileHints(): Promise<FileHint[]> {
  return cached(NAME, { ttlSeconds: 600, tags: [FILE_HINTS_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? fileHintsSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : DEFAULT_FILE_HINTS.map((h) => ({ ...h }));
  });
}

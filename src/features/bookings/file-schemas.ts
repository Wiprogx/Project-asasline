import { z } from "zod";
import { FILE_STAGES } from "@/domain/files";

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_]{1,29}$/, "A code: capitals, digits, _")
  .optional()
  .transform((v) => v || null);

const optionalUuid = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

/** What a file is filed as; the file itself comes beside these fields in the same FormData. */
export const fileMetaSchema = z.object({
  bookingId: z.uuid(),
  code,
  stage: z.enum(FILE_STAGES).default("final"),
  ruleCode: code,
  containerId: optionalUuid,
  note: z.string().trim().max(300).optional(),
});

export const refileSchema = z.object({
  bookingId: z.uuid(),
  fileId: z.uuid(),
  code,
  stage: z.enum(FILE_STAGES),
  ruleCode: code,
});

export const archiveFileSchema = z.object({
  bookingId: z.uuid(),
  fileId: z.uuid(),
  reason: z.string().trim().min(3, "Say why — it stays on the record").max(300),
});

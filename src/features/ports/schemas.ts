import { z } from "zod";
import { parseAliases, PORT_CODE, PORT_KINDS } from "@/domain/ports";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** Decimal degrees, five places at most (about a metre); empty: not known. */
const degrees = (label: string, limit: number) =>
  optionalText(12).refine(
    (v) => v === null || (/^-?\d{1,3}(\.\d{1,5})?$/.test(v) && Math.abs(Number(v)) <= limit),
    `${label}: decimal degrees, -${limit} to ${limit}, e.g. 4.04830`,
  );

/** An IANA time zone the runtime knows (Africa/Douala); empty: not said. */
const timezone = optionalText(60).refine((v) => {
  if (v === null) return true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: v });
    return true;
  } catch {
    return false;
  }
}, "A time zone such as Africa/Douala");

/** Everything about a port but its code, which is the port's for good. */
const details = {
  name: z.string().trim().min(2, "Name the port").max(80),
  country: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]{2}$/.test(v), "Two letters, e.g. CM"),
  regionId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  kind: z.enum(PORT_KINDS).default("sea"),
  aliases: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => parseAliases(v ?? "")),
  latitude: degrees("Latitude", 90),
  longitude: degrees("Longitude", 180),
  timezone,
  preClearance: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  notes: optionalText(1000),
};

export const createPortSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => PORT_CODE.test(v), "A UN/LOCODE: country and three letters, e.g. BEANR"),
    ...details,
  })
  .refine((p) => p.code.startsWith(p.country), {
    path: ["country"],
    message: "A UN/LOCODE starts with its country",
  });

const ref = { id: z.uuid(), version: z.coerce.number().int().positive() };

export const updatePortSchema = z.object({ ...ref, ...details });

export const archivePortSchema = z.object({
  ...ref,
  reason: z.string().trim().min(3, "Say why — it stays on the record").max(500),
});

export const restorePortSchema = z.object(ref);

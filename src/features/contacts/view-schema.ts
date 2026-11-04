import { z } from "zod";
import { CONTACT_COLUMNS } from "@/domain/contact-list";
import { WIDTH_MAX, WIDTH_MIN } from "@/domain/table-prefs";

/** How the person reads the contacts list: the columns ticked and/or the widths dragged. */
export const contactViewSchema = z.object({
  columns: z.array(z.enum(CONTACT_COLUMNS.map((c) => c.key))).optional(),
  widths: z.record(z.string().max(40), z.number().min(WIDTH_MIN).max(WIDTH_MAX)).optional(),
});

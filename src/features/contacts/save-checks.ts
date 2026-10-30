import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { readPaymentTerms } from "@/server/accounting-config";
import { cityProblem } from "@/server/cities";
import { readCountries } from "@/server/countries";
import { postcodeProblem } from "@/server/postcodes";
import { db } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { liveLookupLabel } from "@/server/lookups";
import type { ContactInput } from "./schemas";

type Refusal = { ok: false; error: string; fieldErrors: Record<string, string[]> };
/** What the contact pointed at before the edit: kept, even when its row was archived since. */
type Before = {
  salutationId: string | null;
  paymentTermId: string | null;
  country: string | null;
  cityId: string | null;
  zip: string | null;
};

/** The same VAT number twice is two files for one company: refused, naming the other one. */
async function vatTaken(vat: string | undefined, exceptId: string | null): Promise<Refusal | null> {
  if (!vat) return null;
  const [other] = await db
    .select({ name: contacts.name })
    .from(contacts)
    .where(
      and(
        eq(contacts.vat, vat),
        isNull(contacts.archivedAt),
        exceptId ? ne(contacts.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (!other) return null;
  return {
    ok: false,
    error: `This VAT number is already on ${other.name} — one company, one contact.`,
    fieldErrors: { vat: [`Already on ${other.name}`] },
  };
}

/** The salutation, payment terms and country picked from their lists (Settings), not anything posted. */
async function offListPicks(c: ContactInput, before?: Before): Promise<Refusal | null> {
  const fresh = (k: keyof Before) => c[k] && c[k] !== before?.[k];
  const fieldErrors: Record<string, string[]> = {};
  if (fresh("salutationId") && !(await liveLookupLabel(db, "salutations", c.salutationId!)))
    fieldErrors.salutationId = ["Pick a salutation from the list"];
  if (fresh("paymentTermId") && !(await readPaymentTerms()).some((t) => t.id === c.paymentTermId))
    fieldErrors.paymentTermId = ["Pick payment terms from the list"];
  if (fresh("country") && !(await readCountries()).some((x) => x.code === c.country && !x.archived))
    fieldErrors.country = ["Pick a country from the list"];
  // The city must be one of the country's: picked again when the country changes.
  const city = await cityProblem(db, c.cityId, c.country, before?.cityId);
  if (city) fieldErrors.cityId = [city];
  // A country with a postcode list (BE, NL, LU, FR, DE) takes only its codes.
  if (c.zip !== before?.zip || c.country !== before?.country) {
    const zip = await postcodeProblem(db, c.zip, c.country);
    if (zip) fieldErrors.zip = [zip];
  }
  if (!Object.keys(fieldErrors).length) return null;
  return { ok: false, error: "Please correct the highlighted fields.", fieldErrors };
}

/** What stops a save before it is written: a pick off its list, a VAT number on another contact. */
export async function refused(c: ContactInput, self?: { id: string } & Before) {
  return (await offListPicks(c, self)) ?? (await vatTaken(c.vat, self?.id ?? null));
}

import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { formatCents } from "@/domain/money";
import { itemLabel } from "@/domain/pricing";
import { destinationsPhrase, letterLines, quotationDoc } from "@/domain/quotation-doc";
import { DEFAULT_TEMPLATES, fillTemplate } from "@/domain/templates";
import type { QuotationStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { readTemplates, signatureOf } from "@/server/messaging";
import {
  contacts,
  quotationLines,
  quotationRoutes,
  quotations,
  rateItems,
} from "@/server/db/schema";
import { cache } from "react";

export type QuotationRow = {
  id: string;
  ref: string;
  status: QuotationStatus;
  clientName: string;
  validUntil: string | null;
  /** What its live destinations sell (legacy qSellAll): per-container lines × boxes, terms nothing. */
  valueCents: number;
  destinations: number;
};

const valueOf = sql<number>`(select coalesce(sum(ql.qty * (case when ql.per_box then greatest(1, qr.boxes) else 1 end) * ql.sell_cents), 0)
  from quotation_lines ql join quotation_routes qr on qr.id = ql.route_id
  where qr.quotation_id = ${quotations.id} and qr.declined = false and qr.archived_at is null
  and ql.archived_at is null and ql.condition = false and ql.sell_cents > 0)::int`;
const destinationsOf = sql<number>`(select count(*) from quotation_routes qr
  where qr.quotation_id = ${quotations.id} and qr.archived_at is null)::int`;

export async function listQuotations(
  opts: { q?: string; clientId?: string; status?: QuotationStatus } = {},
) {
  await requirePermission("app.quotations");
  const q = opts.q?.trim() ?? "";
  return cached(
    `quotations:list:${opts.clientId ?? "*"}:${opts.status ?? "*"}:${q.toLowerCase()}`,
    { ttlSeconds: 30, tags: [tags.quotations] },
    (): Promise<QuotationRow[]> => {
      const like = `%${q}%`;
      return db
        .select({
          id: quotations.id,
          ref: quotations.ref,
          status: quotations.status,
          clientName: contacts.name,
          validUntil: quotations.validUntil,
          valueCents: valueOf,
          destinations: destinationsOf,
        })
        .from(quotations)
        .innerJoin(contacts, eq(contacts.id, quotations.clientId))
        .where(
          and(
            opts.clientId ? eq(quotations.clientId, opts.clientId) : undefined,
            opts.status ? eq(quotations.status, opts.status) : undefined,
            q ? or(ilike(quotations.ref, like), ilike(contacts.name, like)) : undefined,
          ),
        )
        .orderBy(desc(quotations.ref))
        .limit(500);
    },
  );
}

/** One quotation with its client, routes and lines; cached per request (layout + page share it). */
export const getQuotation = cache(async (id: string) => {
  await requirePermission("app.quotations");
  return db.query.quotations.findFirst({
    where: eq(quotations.id, id),
    with: {
      client: {
        columns: { id: true, name: true, email: true, whatsapp: true, mobile: true, lang: true },
      },
      bookings: { columns: { id: true, ref: true, status: true, quotationRouteId: true } },
      routes: {
        orderBy: asc(quotationRoutes.position),
        with: {
          lines: {
            where: isNull(quotationLines.archivedAt),
            orderBy: [asc(quotationLines.position), asc(quotationLines.createdAt)],
          },
        },
      },
    },
  });
});

/** The catalogue as the quotation editor offers it: ocean legs for a destination, all for a line. */
export async function catalogueChoices() {
  await requirePermission("app.quotations");
  const rows = await db
    .select()
    .from(rateItems)
    .where(isNull(rateItems.archivedAt))
    .orderBy(asc(rateItems.category), asc(rateItems.pod), asc(rateItems.name));
  const all = rows.map((it) => ({ value: it.id, label: itemLabel(it), category: it.category }));
  return { lanes: all.filter((x) => x.category === "ocean"), items: all };
}

type Quotation = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;

/**
 * The letter that goes with the quotation, from the QUOTE_OUT template (Settings › Templates)
 * in the contact's language when there is one (QUOTE_OUT_FR, QUOTE_OUT_NL…, invariant 9),
 * and where it can go: the customer's e-mail, or their WhatsApp.
 */
export async function quotationLetter(q: Quotation, me: string) {
  await requirePermission("app.quotations");
  const all = await readTemplates();
  const inLang = `QUOTE_OUT_${(q.client.lang ?? "en").toUpperCase()}`;
  const t =
    all.find((x) => x.code === inLang && x.active) ??
    all.find((x) => x.code === "QUOTE_OUT" && x.active) ??
    DEFAULT_TEMPLATES.find((x) => x.code === "QUOTE_OUT")!;
  const doc = quotationDoc(q.routes, q.display);
  const vars = {
    client: q.client.name,
    ref: q.ref,
    dest: destinationsPhrase(doc),
    total: formatCents(doc.totalCents),
    validUntil: q.validUntil,
    lines: letterLines(doc, (c) => formatCents(c)),
    me,
    sign: await signatureOf(me),
  };
  return {
    subject: fillTemplate(t.subject, vars),
    body: fillTemplate(t.body, vars),
    email: q.client.email,
    whatsapp: q.client.whatsapp ?? q.client.mobile,
  };
}

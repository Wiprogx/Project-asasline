import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { HsLine } from "@/domain/goods";
import { sealOf, sealText } from "@/domain/seals";
import type { DbOrTx } from "./db/client";
import { containerHsLines, containerSeals, packageTypes, sealSources } from "./db/schema";

/** A box's goods as the domain reads them: its HS lines, its seals ("ABC1234 (Carrier)"). */
export type BoxGoods = { hsLines: HsLine[]; seals: string[]; packageType: string | null };

/**
 * The live HS lines and seals of each box, and its own package type, in the words of their
 * Settings tables (Package types, Seal sources): what every screen and printed copy reads.
 */
export async function goodsOf(
  tx: DbOrTx,
  boxes: readonly { id: string; packageTypeId: string | null }[],
): Promise<Map<string, BoxGoods>> {
  const out = new Map<string, BoxGoods>();
  if (boxes.length === 0) return out;
  const ids = boxes.map((b) => b.id);
  const typeIds = [...new Set(boxes.map((b) => b.packageTypeId).filter((x): x is string => !!x))];
  const [lines, seals, types] = await Promise.all([
    tx
      .select({
        containerId: containerHsLines.containerId,
        code: containerHsLines.code,
        weightKg: containerHsLines.weightKg,
        packages: containerHsLines.packages,
        packageType: packageTypes.label,
      })
      .from(containerHsLines)
      .leftJoin(packageTypes, eq(packageTypes.id, containerHsLines.packageTypeId))
      .where(and(inArray(containerHsLines.containerId, ids), isNull(containerHsLines.archivedAt)))
      .orderBy(asc(containerHsLines.position)),
    tx
      .select({
        containerId: containerSeals.containerId,
        no: containerSeals.number,
        source: sealSources.label,
      })
      .from(containerSeals)
      .leftJoin(sealSources, eq(sealSources.id, containerSeals.sourceId))
      .where(and(inArray(containerSeals.containerId, ids), isNull(containerSeals.archivedAt)))
      .orderBy(asc(containerSeals.position)),
    typeIds.length
      ? tx
          .select({ id: packageTypes.id, label: packageTypes.label })
          .from(packageTypes)
          .where(inArray(packageTypes.id, typeIds))
      : Promise.resolve([]),
  ]);
  const typeLabel = new Map(types.map((t) => [t.id, t.label]));
  for (const b of boxes)
    out.set(b.id, {
      hsLines: [],
      seals: [],
      packageType: b.packageTypeId ? (typeLabel.get(b.packageTypeId) ?? null) : null,
    });
  for (const { containerId, ...l } of lines) out.get(containerId)!.hsLines.push(l);
  for (const s of seals) out.get(s.containerId)!.seals.push(sealText(s));
  return out;
}

type Words = { hsLines: readonly HsLine[]; seals: readonly string[]; packageType?: string | null };

/** Live rows of a list by their words (any case). */
async function idsByLabel(tx: DbOrTx, table: typeof packageTypes, labels: readonly string[]) {
  const wanted = [...new Set(labels.map((l) => l.toLowerCase()))];
  if (wanted.length === 0) return new Map<string, string>();
  const rows = await tx
    .select({ id: table.id, label: table.label })
    .from(table)
    .where(and(isNull(table.archivedAt), inArray(sql`lower(${table.label})`, wanted)));
  return new Map(rows.map((r) => [r.label.toLowerCase(), r.id]));
}

/**
 * The words typed on the box form, as rows of their tables: every package type and seal source
 * must be offered (Settings › Lists), or the first unknown one is the answer.
 */
export async function resolveGoods(tx: DbOrTx, w: Words) {
  const seals = w.seals.map(sealOf);
  const typeWords = [...w.hsLines.map((l) => l.packageType), w.packageType ?? null].filter(
    (x): x is string => !!x,
  );
  const sourceWords = seals.map((s) => s.source).filter((x): x is string => !!x);
  const [types, sources] = await Promise.all([
    idsByLabel(tx, packageTypes, typeWords),
    idsByLabel(tx, sealSources as unknown as typeof packageTypes, sourceWords),
  ]);
  const badType = typeWords.find((t) => !types.has(t.toLowerCase()));
  if (badType)
    return { problem: `Package type "${badType}" is not in Settings › Bookings › Package types.` };
  const badSource = sourceWords.find((s) => !sources.has(s.toLowerCase()));
  if (badSource)
    return { problem: `Seal source "${badSource}" is not in Settings › Bookings › Seal sources.` };
  const typeId = (t: string | null | undefined) => (t ? types.get(t.toLowerCase())! : null);
  return {
    problem: null,
    packageTypeId: typeId(w.packageType),
    hsLines: w.hsLines.map((l, position) => ({
      position,
      code: l.code,
      weightKg: l.weightKg,
      packages: l.packages,
      packageTypeId: typeId(l.packageType),
    })),
    seals: seals.map((s, position) => ({
      position,
      number: s.no,
      sourceId: s.source ? sources.get(s.source.toLowerCase())! : null,
    })),
  };
}

type Resolved = Exclude<Awaited<ReturnType<typeof resolveGoods>>, { problem: string }>;

/** The box's lines and seals replaced as a whole: the old ones archived, never deleted. */
export async function replaceGoods(
  tx: DbOrTx,
  containerId: string,
  g: Pick<Resolved, "hsLines" | "seals">,
  userId: string | null,
) {
  const gone = { archivedAt: new Date(), archivedBy: userId, archivedReason: "Replaced on save" };
  await tx
    .update(containerHsLines)
    .set(gone)
    .where(and(eq(containerHsLines.containerId, containerId), isNull(containerHsLines.archivedAt)));
  await tx
    .update(containerSeals)
    .set(gone)
    .where(and(eq(containerSeals.containerId, containerId), isNull(containerSeals.archivedAt)));
  const by = { createdBy: userId, updatedBy: userId };
  if (g.hsLines.length)
    await tx.insert(containerHsLines).values(g.hsLines.map((l) => ({ ...l, containerId, ...by })));
  if (g.seals.length)
    await tx.insert(containerSeals).values(g.seals.map((s) => ({ ...s, containerId, ...by })));
}

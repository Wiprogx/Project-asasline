/**
 * Away, and who covers (legacy COVERS / coverFor / addCover). When somebody is away a colleague
 * covers: for those days the absent person's tasks — and new ones meant for them — show in the
 * colleague's list. Nothing is moved; when they are back everything is theirs again. Leaving
 * for good is a hand-over instead, which does move the tasks, once, on the record.
 */
export type Cover = {
  absentId: string;
  coverId: string;
  fromDate: string;
  toDate: string | null;
  ended: boolean;
};

const overlaps = (
  a: { fromDate: string; toDate: string | null },
  from: string,
  to: string | null,
) => a.fromDate <= (to ?? "9999-12-31") && (a.toDate ?? "9999-12-31") >= from;

/** The cover running for somebody on a day, if any. */
export function coverOn(covers: readonly Cover[], absentId: string, day: string): Cover | null {
  return covers.find((c) => !c.ended && c.absentId === absentId && overlaps(c, day, day)) ?? null;
}

/** Whom I cover on a day: their tasks are mine for the day. */
export const coveredBy = (covers: readonly Cover[], coverId: string, day: string) =>
  covers
    .filter((c) => !c.ended && c.coverId === coverId && overlaps(c, day, day))
    .map((c) => c.absentId);

/** Why a new cover cannot be recorded, or null. Names are for the message only. */
export function coverProblem(
  next: { absentId: string; coverId: string; from: string; to: string | null },
  covers: readonly Cover[],
  names: { absent: string; cover: string },
): string | null {
  if (next.absentId === next.coverId) return "Somebody else has to cover.";
  if (next.to && next.to < next.from) return "The end is before the start.";
  const live = covers.filter((c) => !c.ended);
  if (live.some((c) => c.absentId === next.coverId && overlaps(c, next.from, next.to)))
    return `${names.cover} is away then too.`;
  if (live.some((c) => c.absentId === next.absentId && overlaps(c, next.from, next.to)))
    return `${names.absent} is already covered for those days.`;
  return null;
}

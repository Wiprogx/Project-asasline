/**
 * A legacy activity (legacy activities[]: who, due, st, link, contact, ruleCode, box) as a
 * task. The person is found by name among the imported users; the link is the booking or
 * quotation its reference names, else the contact; a rule step keeps its code, per box as the
 * new app names it (`CODE#<container id>`, domain/rules/plan stepKey).
 */
import type { TaskState } from "./tasks";

export type ActivityLookups = {
  user: (name: string) => string | null;
  /** A booking or quotation by its SB / QT reference. */
  record: (ref: string) => { kind: "booking" | "quotation"; id: string } | null;
  contact: (name: string) => string | null;
  /** The container a per-box step names ("MSKU1234565" or "container 2"), on that booking. */
  box: (bookingId: string, label: string) => string | null;
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v: unknown) => {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

function stateOf(t: Record<string, unknown>): { state: TaskState; reason: string | null } {
  const withdrawn = (t.withdrawn ?? null) as Record<string, unknown> | null;
  if (t.st === "withdrawn" || withdrawn)
    return {
      state: "withdrawn",
      reason: text(withdrawn?.why) ?? text(t.closedBy) ?? "Withdrawn in the legacy office",
    };
  if (t.st === "done") return { state: "done", reason: null };
  return { state: "open", reason: null };
}

export function mapLegacyActivity(t: Record<string, unknown>, find: ActivityLookups) {
  const title = text(t.title);
  if (!title) return null;
  const warnings: string[] = [];
  const who = text(t.who);
  const assigneeId = who ? find.user(who) : null;
  if (who && !assigneeId) warnings.push(`"${who}" is not a user here — the task has nobody`);
  const ref = text(t.link);
  const record = ref ? find.record(ref) : null;
  const contactName = text(t.contact);
  const contactId = !record && contactName ? find.contact(contactName) : null;
  if (ref && !record && !contactId)
    warnings.push(`its record ${ref} was not found — kept unlinked`);
  const code = text(t.ruleCode);
  const box = text(t.box);
  let ruleCode = code;
  if (code && box && record?.kind === "booking") {
    const containerId = find.box(record.id, box);
    if (containerId) ruleCode = `${code}#${containerId}`;
    else warnings.push(`its box "${box}" was not found on ${ref}`);
  }
  const { state, reason } = stateOf(t);
  return {
    task: {
      title,
      /** Resolved to a Settings › Lists › Task types row by the importer. */
      typeLabel: text(t.type) ?? "To do",
      assigneeId,
      due: day(t.due),
      ruleCode,
      // The legacy closed it by its words (closeAutoActivities "Confirm booking"); here by its trigger.
      trigger: t.auto === true && /^Confirm booking/.test(title) ? "booking_created" : null,
      state,
      /** Resolved to a Settings › Withdraw reasons row by the importer (scripts/import/reasons). */
      withdrawReasonLabel: reason,
      note: text(t.note),
      linkKind: record?.kind ?? (contactId ? "contact" : null),
      linkId: record?.id ?? contactId,
    },
    warnings,
  };
}

/** "MSKU1234565" names a box by its number; "container 2" or "box 2" by its place. */
export function boxPosition(label: string): number | null {
  const m = /(?:container|box)\s*(\d+)/i.exec(label);
  return m ? Number(m[1]) - 1 : null;
}

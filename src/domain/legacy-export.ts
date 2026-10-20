/**
 * The legacy office as exported for the go-live (docs/MIGRATION.md, "Data migration"): the
 * MySQL `records` table (kind, id, body JSON, version, archived) and the `users` table, either
 * as phpMyAdmin's JSON export of the database or as a plain object `{ records, users }`.
 */

export type LegacyRecord = {
  kind: string;
  id: string;
  body: Record<string, unknown>;
  archived: boolean;
};
export type LegacyExport = {
  records: LegacyRecord[];
  users: Record<string, unknown>[];
  /** Rows that could not be read, with why: reported, never imported half-read. */
  unreadable: string[];
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** MySQL exports a tinyint as "0"/"1", JSON as true/false; anything else counts as live. */
const truthy = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";

function recordOf(row: unknown, n: number): LegacyRecord | string {
  if (!isObject(row)) return `record ${n}: not an object`;
  const kind = typeof row.kind === "string" ? row.kind : "";
  const id = row.id === undefined || row.id === null ? "" : String(row.id);
  if (!kind || !id) return `record ${n}: no kind or id`;
  let body: unknown = row.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return `${kind} ${id}: body is not JSON`;
    }
  }
  if (!isObject(body)) return `${kind} ${id}: body is not an object`;
  return { kind, id, body, archived: truthy(row.archived) };
}

/** phpMyAdmin writes `[{type:"header"}, {type:"table", name, data:[…]}, …]`. */
function tablesOf(parsed: unknown): { records: unknown[]; users: unknown[] } | null {
  if (isObject(parsed) && (Array.isArray(parsed.records) || Array.isArray(parsed.users)))
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  if (!Array.isArray(parsed)) return null;
  const table = (name: string) =>
    parsed.find(
      (t) => isObject(t) && t.type === "table" && t.name === name && Array.isArray(t.data),
    );
  const records = table("records") as { data: unknown[] } | undefined;
  const users = table("users") as { data: unknown[] } | undefined;
  if (records || users) return { records: records?.data ?? [], users: users?.data ?? [] };
  return parsed.every(isObject) ? { records: parsed, users: [] } : null;
}

/** The export read whole: every record with its body parsed, the users as they came. */
export function readLegacyExport(text: string): LegacyExport | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "The file is not JSON. Export the legacy database as JSON." };
  }
  const tables = tablesOf(parsed);
  if (!tables) return { error: "No `records` or `users` table in the file." };
  const records: LegacyRecord[] = [];
  const unreadable: string[] = [];
  tables.records.forEach((row, i) => {
    const r = recordOf(row, i + 1);
    if (typeof r === "string") unreadable.push(r);
    else records.push(r);
  });
  return { records, users: tables.users.filter(isObject), unreadable };
}

/** How many records of each kind, for the report before anything is written. */
export function countByKind(records: readonly LegacyRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) out[r.kind] = (out[r.kind] ?? 0) + 1;
  return out;
}

/**
 * A legacy file (legacy addFile / linkFile: name, data as a data: URL, size, links to a
 * booking, a document code and a box) as what the import files on each booking. The bytes stay
 * base64 here; the import decodes and stores them.
 */
import { ALLOWED_TYPES, extensionOf } from "./files";

export type LegacyFileLink = {
  ref: string;
  code: string | null;
  box: string | null;
  draft: boolean;
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** "data:application/pdf;base64,JVBER…" → its type and its base64 body; null when it is not one. */
export function parseDataUrl(v: unknown): { mime: string; base64: string } | null {
  const m = typeof v === "string" ? /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(v) : null;
  return m && m[2] ? { mime: m[1] || "application/octet-stream", base64: m[3] } : null;
}

export function mapLegacyFile(f: Record<string, unknown>) {
  const name = text(f.name);
  if (!name) return { skip: "no name" };
  const data = parseDataUrl(f.data);
  if (!data) return { skip: `${name}: its content is not in the export` };
  const ext = extensionOf(name);
  const links: LegacyFileLink[] = (
    Array.isArray(f.links) ? (f.links as Record<string, unknown>[]) : []
  )
    .filter((l) => text(l?.ref))
    .map((l) => ({
      ref: text(l.ref)!,
      code: text(l.code),
      box: text(l.box),
      draft: l.stage === "draft" || l.v === "draft",
    }));
  if (!links.length) return { skip: `${name}: filed on no booking` };
  return {
    name: name.slice(0, 200),
    ext,
    mime: ALLOWED_TYPES[ext] ?? data.mime,
    base64: data.base64,
    links,
  };
}

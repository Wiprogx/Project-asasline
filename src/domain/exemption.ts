/**
 * An invoice exempt under article 41 (export, VAT code EX41) needs proof that the goods left
 * the Union: the export declaration (EX-A) or the bill of lading on the booking's file
 * (legacy "exempt invoice warns if the file lacks EX-A/BL proof"). The office is warned, never
 * blocked: the paper may be on its way.
 */
export const EXEMPT_VAT_CODE = "EX41";

/** A final document whose code proves the export: the EX-A, or a bill of lading that is not a draft. */
export const provesExport = (code: string | null | undefined, stage: string | null | undefined) =>
  stage === "final" &&
  !!code &&
  (code.toUpperCase() === "EXA" ||
    (/^(BL|OBL|SWB|SEAWAYBILL)/i.test(code) && !/DRAFT/i.test(code)));

/** True when a line is exempt and nothing on file proves the export. */
export function exemptionProofMissing(
  lines: readonly { vatCode: string }[],
  files: readonly { code: string | null; stage: string | null }[],
): boolean {
  if (!lines.some((l) => l.vatCode === EXEMPT_VAT_CODE)) return false;
  return !files.some((f) => provesExport(f.code, f.stage));
}

export const EXEMPTION_WARNING =
  "exempt under art. 41 without an export proof on file (EX-A or B/L) — add it before the VAT return";

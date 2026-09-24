/**
 * Files on a booking (legacy b.docs, FILE_HINTS, reqDocsOf): what is filed under which code,
 * and which papers the shipment still lacks. The rules engine says which steps exist; this
 * says which of them have their paper.
 */

/** Seed for the `fileHints` Settings table: words in a file name → the code it is filed under. */
export const DEFAULT_FILE_HINTS = [
  { words: "invoice, facture, factuur", code: "INVOICE" },
  { words: "exa, ex-a, ex-1, declaration, douane", code: "EXA" },
  { words: "vgm, certiweight", code: "CERTIWEIGHT" },
  { words: "shipping instruction, si-", code: "SI" },
  { words: "draft bl, bl draft, bl-draft, draft-bl", code: "BL_DRAFT" },
  { words: "bietc", code: "BIETC" },
  { words: "besc", code: "BESC" },
  { words: "acid", code: "ACID" },
  { words: "cmr", code: "CMR" },
] as const;

export type FileHint = { words: string; code: string };

export const FILE_STAGES = ["draft", "final"] as const;
export type FileStage = (typeof FILE_STAGES)[number];

/** What the office files: paper as PDF or a photo, the customer's sheets, a mail. */
export const ALLOWED_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".eml": "message/rfc822",
  ".msg": "application/vnd.ms-outlook",
};
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const extensionOf = (name: string) => {
  const m = /\.[A-Za-z0-9]+$/.exec(name.trim());
  return m ? m[0].toLowerCase() : "";
};

/** Why a file cannot be filed, or null. */
export function fileProblem(f: { name: string; size: number }): string | null {
  const ext = extensionOf(f.name);
  if (!ext || !(ext in ALLOWED_TYPES))
    return `"${f.name}": not a file the office keeps (PDF, photo, sheet, Word, CSV, text or a mail).`;
  if (f.size === 0) return `"${f.name}" is empty.`;
  if (f.size > MAX_FILE_BYTES) return `"${f.name}" is over 25 MB.`;
  return null;
}

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The code a file name suggests (legacy FILE_HINTS): the first hint whose words appear in it. */
export function fileCodeOf(name: string, hints: readonly FileHint[]): string | null {
  for (const h of hints) {
    const words = h.words
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length && new RegExp(words.map(escapeRe).join("|"), "i").test(name)) return h.code;
  }
  return null;
}

export type RequirementState = "missing" | "draft" | "final";

export type Requirement = {
  /** The rule's code, or `CODE#boxId` for a per-box step. */
  code: string;
  label: string;
  /** Where the requirement comes from: the destination country's papers, or a document step. */
  source: "destination" | "step";
  state: RequirementState;
  /** A step already done or waiting does not ask for a file it has, or cannot have yet. */
  stepStatus?: "done" | "open" | "waiting";
};

/**
 * The papers this shipment must hold, and whether each is there (legacy reqDocsOf +
 * destDocState): one per document the destination country asks for, and one per step of the
 * chain that produces a paper. A final file under the code settles it; a draft is a draft.
 */
export function requirementsOf(input: {
  destinationDocs: readonly { code: string; label: string }[];
  steps: readonly { code: string; doc: string; status: "done" | "open" | "waiting" }[];
  files: readonly { code: string | null; ruleCode?: string | null; stage: FileStage }[];
}): Requirement[] {
  // A file proves a step by the step it was filed against, or, for a step of no box, by its code.
  const stateOf = (code: string): RequirementState => {
    const mine = input.files.filter(
      (f) => f.ruleCode === code || (!code.includes("#") && !f.ruleCode && f.code === code),
    );
    if (mine.some((f) => f.stage === "final")) return "final";
    return mine.length ? "draft" : "missing";
  };
  const seen = new Set<string>();
  const out: Requirement[] = [];
  for (const d of input.destinationDocs) {
    if (seen.has(d.code)) continue;
    seen.add(d.code);
    out.push({ code: d.code, label: d.label, source: "destination", state: stateOf(d.code) });
  }
  for (const s of input.steps) {
    if (seen.has(s.code)) continue;
    seen.add(s.code);
    out.push({
      code: s.code,
      label: s.doc,
      source: "step",
      state: stateOf(s.code),
      stepStatus: s.status,
    });
  }
  return out;
}

/** How many papers are still missing, for a badge: steps that are done or waiting do not count. */
export const missingCount = (reqs: readonly Requirement[]) =>
  reqs.filter((r) => r.state === "missing" && (r.stepStatus ?? "open") === "open").length;

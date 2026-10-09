/**
 * Files on a booking (legacy b.docs, FILE_HINTS, reqDocsOf): what is filed under which code,
 * and which papers the shipment still lacks. The rules engine says which steps exist; this
 * says which of them have their paper.
 */
import type { NeedKind } from "./rules/engine";

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

/** The office's word on a paper (legacy req states verified / rejected). */
export type ReviewState = "checked" | "sent_back";
export type Review = { code: string; state: ReviewState; note: string | null; at: string };

export type RequirementState = "missing" | "draft" | "final" | ReviewState;

export type Requirement = {
  /** The rule's code, or `CODE#boxId` for a per-box step. */
  code: string;
  label: string;
  /** Where the requirement comes from: the destination country's papers, or a document step. */
  source: "destination" | "step";
  state: RequirementState;
  /** A step already done or waiting does not ask for a file it has, or cannot have yet. */
  stepStatus?: "done" | "open" | "waiting";
  /** Why it was sent back, or what was noted when it was checked. */
  note?: string | null;
  /** The list this paper is checked against (Settings › Checklists), when its rule names one. */
  checklist?: string | null;
  /** What closes the step (legacy NEED_KINDS): the document unless the rule says otherwise. */
  need?: NeedKind;
};

/**
 * The papers this shipment must hold, and whether each is there (legacy reqDocsOf +
 * destDocState): one per document the destination country asks for, and one per step of the
 * chain that produces a paper. A final file under the code settles it; a draft is a draft.
 * The office's word stands over the files: checked, or sent back with a reason — until a paper
 * filed after it asks for a new look (`at` orders a review against the files, nothing more).
 */
export function requirementsOf(input: {
  destinationDocs: readonly { code: string; label: string }[];
  steps: readonly {
    code: string;
    doc: string;
    status: "done" | "open" | "waiting";
    checklist?: string | null;
    need?: NeedKind;
  }[];
  files: readonly {
    code: string | null;
    ruleCode?: string | null;
    stage: FileStage;
    at?: string;
  }[];
  reviews?: readonly Review[];
}): Requirement[] {
  // A file proves a step by the step it was filed against, or, for a step of no box, by its code.
  const filesOf = (code: string) =>
    input.files.filter(
      (f) => f.ruleCode === code || (!code.includes("#") && !f.ruleCode && f.code === code),
    );
  const wordOn = (code: string): Review | null => {
    const review = input.reviews?.find((r) => r.code === code);
    if (!review) return null;
    return filesOf(code).some((f) => f.at && f.at > review.at) ? null : review;
  };
  const stateOf = (code: string): Pick<Requirement, "state" | "note"> => {
    const review = wordOn(code);
    if (review) return { state: review.state, note: review.note };
    const mine = filesOf(code);
    if (mine.some((f) => f.stage === "final")) return { state: "final" };
    return { state: mine.length ? "draft" : "missing" };
  };
  const seen = new Set<string>();
  const out: Requirement[] = [];
  for (const d of input.destinationDocs) {
    if (seen.has(d.code)) continue;
    seen.add(d.code);
    out.push({ code: d.code, label: d.label, source: "destination", ...stateOf(d.code) });
  }
  for (const s of input.steps) {
    if (seen.has(s.code)) continue;
    seen.add(s.code);
    out.push({
      code: s.code,
      label: s.doc,
      source: "step",
      stepStatus: s.status,
      checklist: s.checklist ?? null,
      need: s.need ?? "file",
      ...stateOf(s.code),
    });
  }
  return out;
}

/** How many papers are still missing, for a badge: a paper sent back counts; done or waiting steps do not. */
export const missingCount = (reqs: readonly Requirement[]) =>
  reqs.filter(
    (r) =>
      (r.state === "missing" || r.state === "sent_back") && (r.stepStatus ?? "open") === "open",
  ).length;

/**
 * The office's lists, one table each (Settings › Lists): a person picks an offered row; the
 * app picks a coded one by itself — its words live in the table and may be changed there, its
 * code never moves (the migration that made the table created each one).
 */
export const LOOKUP_KINDS = [
  "cancel-reasons",
  "withdraw-reasons",
  "salutations",
  "doc-types",
  "task-types",
  "package-types",
  "seal-sources",
  "person-roles",
  "location-roles",
  "contact-doc-kinds",
  "professions",
  "contact-tags",
  "container-types",
  "port-regions",
] as const;
export type LookupKind = (typeof LOOKUP_KINDS)[number];

/**
 * Lists whose coded rows the app gives by itself and never offers to a person (a task withdrawn
 * because its booking was cancelled). Elsewhere a code only marks a row the app relies on (the
 * document a new booking starts with): offered like any other, never archived.
 */
export const HIDDEN_CODED: readonly LookupKind[] = ["withdraw-reasons"];

/** The document a new booking starts with. */
export const DEFAULT_DOC_TYPE = "sea_waybill";

/** The container type a new box starts as (40HC). */
export const DEFAULT_CONTAINER_TYPE = "default_box";

/** A customer's delivery address (a linked location): where a door service loads by default. */
export const DELIVERY_ROLE = "delivery";

/** The task types the app gives by itself: a task to do, a call to return. */
export const TASK_TYPE_CODES = { toDo: "to_do", call: "call" } as const;

/** Why the app withdraws a task by itself. */
export const WITHDRAW_CODES = [
  "booking_cancelled",
  "quotation_cancelled",
  "rule_dropped",
  "box_left",
] as const;
export type WithdrawCode = (typeof WITHDRAW_CODES)[number];

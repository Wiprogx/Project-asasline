import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  type PgColumnBuilderBase,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { recordColumns } from "./_columns";

/**
 * A list table of Settings › Lists: the words, their place in the picker and — for a row the app
 * gives by itself (a task withdrawn because its booking was cancelled) — its fixed `code`. A
 * coded row is never offered to a person and never archived; its words may be changed. Never
 * deleted: a row no longer offered is archived with a reason, and the records keep pointing at
 * it. The same words are live once (any case); a code is unique.
 */
const listColumns = {
  ...recordColumns,
  label: text().notNull(),
  position: integer().notNull().default(0),
  code: text(),
};

const listTable = <
  N extends string,
  E extends Record<string, PgColumnBuilderBase> = Record<never, never>,
>(
  name: N,
  extra: E = {} as E,
) =>
  pgTable(name, { ...listColumns, ...extra }, (t) => [
    uniqueIndex(`${name}_label_uq`)
      .on(sql`lower(${t.label})`)
      .where(sql`${t.archivedAt} is null`),
    uniqueIndex(`${name}_code_uq`)
      .on(t.code)
      .where(sql`${t.code} is not null`),
  ]);

/** Why a quotation or a booking was cancelled (legacy CANCEL_REASONS). */
export const cancelReasons = listTable("cancel_reasons");

/** Why a task was withdrawn (legacy WITHDRAW_REASONS); the app's own reasons are coded. */
export const withdrawReasons = listTable("withdraw_reasons");

/** How a person is addressed (legacy salutations): Mr, Mrs, Dr… */
export const salutations = listTable("salutations");

/**
 * The transport document a quotation or a booking carries (legacy DOC_TYPES). `onPaper`: its
 * originals travel on paper (legacy PAPER_DOCS, read by `isPaperDoc`), so the Tracking tab
 * follows their courier.
 * "SEA WAYBILL" is coded `sea_waybill`: a new booking starts with it.
 */
export const docTypes = listTable("doc_types", {
  onPaper: boolean().notNull().default(false),
});

/**
 * What kind of task (legacy ACTIVITY_TYPES): Email, Call, To do… "To do" and "Call" are coded:
 * the app opens tasks of those kinds by itself (an escalation, a missed call).
 */
export const taskTypes = listTable("task_types");

/** How the goods are packed (legacy PACKAGE_TYPES): bales, cartons, pallets… */
export const packageTypes = listTable("package_types");

/** Who sealed a container (legacy SEAL_SOURCES): the trucker, the carrier, customs… */
export const sealSources = listTable("seal_sources");

/** What a person linked to a contact is to it: director, accounting, operations… */
export const personRoles = listTable("person_roles");

/** What a location linked to a contact is to it: loading, delivery, consignee, invoicing… */
export const locationRoles = listTable("location_roles");

/** What a paper kept on a contact is: a contract, a power of attorney, an ID (legacy contact docs). */
export const contactDocKinds = listTable("contact_doc_kinds");

/**
 * The trades a contact is in (legacy PROFESSIONS): the five a booking picks its parties from,
 * then what the cargo is. A word typed on a contact that the list lacks is added to it.
 */
export const professions = listTable("professions");

/** Free labels on a contact (legacy tags): a word typed on a contact that the list lacks is added. */
export const tagList = listTable("tags");

/**
 * Container sizes and types, by ISO code (legacy CONTAINER_TYPES): 20DV, 40HC… The code is
 * the row's words. 40HC is coded `default_box`: a new box starts as one.
 */
export const containerTypes = listTable("container_types");

/** The regions a port is filed under (legacy PORTS headings): North Africa, West Africa… */
export const portRegions = listTable("port_regions");

import { sql } from "drizzle-orm";
import type { ContactKind } from "@/domain/contact-list";
import {
  boolean,
  char,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { cents, day, recordColumns } from "./_columns";
import { contactTypeEnum } from "./enums";
import { cities, countries } from "./geo";
import {
  contactDocKinds,
  locationRoles,
  personRoles,
  professions,
  salutations,
  tagList,
} from "./lists";

export const contacts = pgTable(
  "contacts",
  {
    ...recordColumns,
    name: text().notNull(),
    type: contactTypeEnum().notNull().default("company"),
    /** A person's parts; `name` is built from them ("First Last") so every module reads one name. */
    /** How the person is addressed (Settings › Lists › Salutations). */
    salutationId: uuid().references(() => salutations.id),
    firstName: text(),
    lastName: text(),
    jobTitle: text(),
    /** A person's passport number (optional). */
    passportNumber: text(),
    /** A location's site: its code at the carrier or terminal, opening hours, access remarks. */
    siteRef: text(),
    openingHours: text(),
    instructions: text(),
    /** Customer, supplier or both (legacy kind; domain/contact-list CONTACT_KINDS). */
    kind: text().$type<ContactKind>().notNull().default("customer"),
    /** Its country (Settings › Countries), by ISO code. */
    country: char({ length: 2 }).references(() => countries.code),
    lang: text().notNull().default("en"),
    vat: text(),
    eori: text(),
    /** The day each number was checked against the register (legacy tvaChecked / eoriChecked); a new number is unchecked. */
    vatCheckedOn: day(),
    eoriCheckedOn: day(),
    /** Free labels from the contactTags list (legacy tags[]). */
    phone: text(),
    mobile: text(),
    whatsapp: text(),
    email: text(),
    website: text(),
    street: text(),
    zip: text(),
    /** Its city, one of its country's (Settings › Countries), picked from the list. */
    cityId: uuid().references(() => cities.id),
    creditLimitCents: cents(),
    usesLastPrice: boolean().notNull().default(false),
    paymentTermId: text(),
    note: text(),
  },
  (t) => [
    index("contacts_name_idx").on(sql`lower(${t.name})`),
    index("contacts_vat_idx").on(t.vat),
  ],
);

/** Child addresses and persons: loading, delivery, consignee, billing… (legacy children[]). */
export const contactAddresses = pgTable(
  "contact_addresses",
  {
    ...recordColumns,
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    type: text().notNull(),
    name: text(),
    street: text(),
    zip: text(),
    cityId: uuid().references(() => cities.id),
    country: char({ length: 2 }).references(() => countries.code),
    phone: text(),
    email: text(),
    note: text(),
  },
  (t) => [index("contact_addresses_contact_idx").on(t.contactId)],
);

/**
 * Contacts linked to contacts, many to many: a person at a company, a warehouse a client
 * delivers to. The role belongs to the link (the same depot is "Delivery" for one client and
 * "Loading" for another); read from both ends, unlinked with a reason, never deleted.
 */
export const contactLinks = pgTable(
  "contact_links",
  {
    ...recordColumns,
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    linkedId: uuid()
      .notNull()
      .references(() => contacts.id),
    /**
     * The role the linked contact has here: a location's when either end is a location, else a
     * person's (Settings › Lists › Person roles, Location roles) — exactly one of the two.
     */
    personRoleId: uuid().references(() => personRoles.id),
    locationRoleId: uuid().references(() => locationRoles.id),
  },
  (t) => [
    index("contact_links_contact_idx").on(t.contactId),
    index("contact_links_linked_idx").on(t.linkedId),
    uniqueIndex("contact_links_live_uq")
      .on(t.contactId, t.linkedId, sql`coalesce(${t.personRoleId}, ${t.locationRoleId})`)
      .where(sql`archived_at is null`),
    check("contact_links_one_role", sql`num_nonnulls(${t.personRoleId}, ${t.locationRoleId}) = 1`),
  ],
);

export const contactBankAccounts = pgTable(
  "contact_bank_accounts",
  {
    ...recordColumns,
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    iban: text().notNull(),
    bic: text(),
    label: text(),
  },
  (t) => [index("contact_bank_contact_idx").on(t.contactId)],
);

/**
 * Papers kept on the contact itself (legacy contact docs): a contract, a power of attorney, an
 * ID. The bytes live under FILES_DIR/contacts/<contact>/; taken off with a reason, never deleted.
 */
export const contactFiles = pgTable(
  "contact_files",
  {
    ...recordColumns,
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    /** What the paper is (Settings › Lists › Contact document kinds). */
    kindId: uuid()
      .notNull()
      .references(() => contactDocKinds.id),
    name: text().notNull(),
    storedName: text().notNull(),
    mime: text().notNull(),
    sizeBytes: integer().notNull(),
    note: text(),
  },
  (t) => [index("contact_files_contact_idx").on(t.contactId)],
);

/** A contact's professions (Settings › Lists › Professions); replaced on save, the old archived. */
export const contactProfessions = pgTable(
  "contact_professions",
  {
    ...recordColumns,
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    professionId: uuid()
      .notNull()
      .references(() => professions.id),
  },
  (t) => [index("contact_professions_contact_idx").on(t.contactId)],
);

/** A contact's tags (Settings › Lists › Contact tags); replaced on save, the old archived. */
export const contactTags = pgTable(
  "contact_tags",
  {
    ...recordColumns,
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    tagId: uuid()
      .notNull()
      .references(() => tagList.id),
  },
  (t) => [index("contact_tags_contact_idx").on(t.contactId)],
);

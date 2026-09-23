import { sql } from "drizzle-orm";
import { boolean, char, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { cents, recordColumns } from "./_columns";
import { contactTypeEnum } from "./enums";

export const contacts = pgTable(
  "contacts",
  {
    ...recordColumns,
    name: text().notNull(),
    type: contactTypeEnum().notNull().default("company"),
    professions: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    country: char({ length: 2 }),
    lang: text().notNull().default("en"),
    vat: text(),
    eori: text(),
    phone: text(),
    mobile: text(),
    whatsapp: text(),
    email: text(),
    website: text(),
    street: text(),
    zip: text(),
    city: text(),
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
    city: text(),
    country: char({ length: 2 }),
    phone: text(),
    email: text(),
    note: text(),
  },
  (t) => [index("contact_addresses_contact_idx").on(t.contactId)],
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

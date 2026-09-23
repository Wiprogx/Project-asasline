import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";

/** Staff. Switched off, never deleted: their name stays on every record they touched. */
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    name: text().notNull(),
    role: roleEnum().notNull(),
    passwordHash: text().notNull(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)],
);

/** Sessions are stored by the SHA-256 of their token; revoked, not deleted, for the audit. */
export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    ip: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Every login, failed attempt, staff change and sensitive read. Append-only. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userId: uuid(),
    action: text().notNull(),
    entity: text(),
    entityId: text(),
    detail: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_at_idx").on(t.at)],
);

/** Server-issued counters (QT/SB per month, invoice series). Incremented in a transaction. */
export const sequences = pgTable("sequences", {
  key: text().primaryKey(),
  value: integer().notNull(),
});

/**
 * Editable lists and rules (legacy STORE_CONFIG): cancel reasons, ports, document rules…
 * Adding a country, port or document is a row here, not code (invariant 5).
 */
export const configTables = pgTable("config_tables", {
  name: text().primaryKey(),
  value: jsonb().notNull(),
  version: integer().notNull().default(1),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid(),
});

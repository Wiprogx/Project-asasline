import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { CALL_OUTCOMES, CHANNELS, DIRECTIONS } from "../../../domain/messages";
import { recordColumns } from "./_columns";
import { contacts } from "./contacts";
import { users } from "./identity";

export const channelEnum = pgEnum("message_channel", CHANNELS);
export const directionEnum = pgEnum("message_direction", DIRECTIONS);
export const callOutcomeEnum = pgEnum("call_outcome", CALL_OUTCOMES);

/**
 * Every message, whatever the channel (legacy MESSAGES). `linkRef` is the SB/QT number the
 * message belongs to, resolved to `linkKind`/`linkId`; `room` is the internal chat channel
 * (a role, or "office"). Archived, never deleted.
 */
export const messages = pgTable(
  "messages",
  {
    ...recordColumns,
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    channel: channelEnum().notNull(),
    direction: directionEnum().notNull(),
    room: text(),
    fromText: text(),
    toText: text(),
    contactId: uuid().references(() => contacts.id),
    subject: text(),
    body: text().notNull().default(""),
    linkKind: text(),
    linkId: uuid(),
    linkRef: text(),
    topic: text(),
    threadId: text(),
    replyToId: uuid(),
    authorId: uuid().references(() => users.id),
    callSeconds: integer(),
    callOutcome: callOutcomeEnum(),
    claimedBy: uuid().references(() => users.id),
    claimedAt: timestamp({ withTimezone: true }),
    // Outgoing mail is recorded here; the mail server integration will set this when it leaves.
    deliveredAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("messages_at_idx").on(t.at),
    index("messages_link_idx").on(t.linkKind, t.linkId),
    index("messages_thread_idx").on(t.threadId),
    index("messages_room_idx").on(t.room, t.at),
  ],
);

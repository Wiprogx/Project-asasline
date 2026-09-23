import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { type Channel, routeCodeOf, routeRole, inQueueOf, waitedMinutes } from "@/domain/messages";
import type { Role } from "@/domain/permissions";
import { requirePermission } from "@/server/auth/dal";
import { now } from "@/server/clock";
import { db } from "@/server/db/client";
import { bookings, configTables, contacts, messages, users } from "@/server/db/schema";
import { readEscalateMinutes, readRoutes } from "@/server/messaging";

const claimer = alias(users, "claimer");

/**
 * Message guard (legacy 10.4): a message on a booking from a contact who is not a party on it.
 * BV VANGUY once wrote about Os Textile's shipment and nothing noticed; the reply would have
 * sent one customer's details to another.
 */
const stranger = sql<boolean>`(${messages.contactId} is not null and ${bookings.id} is not null and ${messages.contactId} not in (
  ${bookings.clientId}, coalesce(${bookings.payerId}, ${bookings.clientId}), coalesce(${bookings.shipperId}, ${bookings.clientId}),
  coalesce(${bookings.consigneeId}, ${bookings.clientId}), coalesce(${bookings.notifyId}, ${bookings.clientId})))`;

/**
 * Something went back on the thread, or on the same file, after this message arrived. The
 * alias is spelled out: Drizzle renders an aliased table inside raw SQL as a bare name.
 */
const answeredLater = sql<boolean>`exists (select 1 from ${messages} as "later" where "later"."direction" = 'out'
  and "later"."at" > ${messages.at} and ("later"."thread_id" = ${messages.threadId}
  or (${messages.linkId} is not null and "later"."link_id" = ${messages.linkId})))`;

function base() {
  return db
    .select({
      id: messages.id,
      at: messages.at,
      channel: messages.channel,
      direction: messages.direction,
      room: messages.room,
      fromText: messages.fromText,
      toText: messages.toText,
      subject: messages.subject,
      body: messages.body,
      linkKind: messages.linkKind,
      linkId: messages.linkId,
      linkRef: messages.linkRef,
      topic: messages.topic,
      threadId: messages.threadId,
      callSeconds: messages.callSeconds,
      callOutcome: messages.callOutcome,
      deliveredAt: messages.deliveredAt,
      author: users.name,
      contactName: contacts.name,
      claimedByName: claimer.name,
      claimedBy: messages.claimedBy,
      stranger,
      answeredLater,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.authorId))
    .leftJoin(claimer, eq(claimer.id, messages.claimedBy))
    .leftJoin(contacts, eq(contacts.id, messages.contactId))
    .leftJoin(bookings, and(eq(messages.linkKind, "booking"), eq(bookings.id, messages.linkId)));
}

export type MessageRow = Awaited<ReturnType<ReturnType<typeof base>["execute"]>>[number];

export async function roomMessages(room: string) {
  await requirePermission("app.discuss");
  const rows = await base()
    .where(
      and(eq(messages.channel, "internal"), eq(messages.room, room), isNull(messages.archivedAt)),
    )
    .orderBy(desc(messages.at))
    .limit(200);
  return rows.reverse();
}

/**
 * The queue: incoming messages nobody has taken and nothing has answered, each routed to the
 * role its topic names. `role` null = every role (Team lead's overview).
 */
export async function waitingQueue(role: Role | null) {
  await requirePermission("app.discuss");
  const [routes, escalateAfter] = await Promise.all([readRoutes(), readEscalateMinutes()]);
  const at = now();
  const rows = await base()
    .where(
      and(
        eq(messages.direction, "in"),
        isNull(messages.claimedBy),
        isNull(messages.archivedAt),
        sql`not (${messages.channel} = 'call' and ${messages.callOutcome} = 'answered')`,
        sql`not ${answeredLater}`,
      ),
    )
    .orderBy(asc(messages.at))
    .limit(300);
  return rows
    .map((m) => {
      const waited = waitedMinutes(m.at.getTime(), at.getTime());
      return {
        ...m,
        routeRole: routeRole(routeCodeOf(m, routes), routes),
        waited,
        escalated: waited >= escalateAfter,
      };
    })
    .filter((m) => role === null || inQueueOf(m, role, escalateAfter));
}

export async function messagesForRecord(linkKind: "booking" | "quotation", id: string) {
  await requirePermission("app.discuss");
  if (!z.uuid().safeParse(id).success) return [];
  return base()
    .where(
      and(
        eq(messages.linkKind, linkKind),
        eq(messages.linkId, id),
        ne(messages.channel, "internal"),
      ),
    )
    .orderBy(desc(messages.at))
    .limit(300);
}

/** Everything that is not internal chat, newest first, with search. */
export async function allMessages(opts: { q?: string; channel?: Channel }) {
  await requirePermission("app.discuss");
  const where: (SQL | undefined)[] = [
    ne(messages.channel, "internal"),
    isNull(messages.archivedAt),
  ];
  if (opts.channel) where.push(eq(messages.channel, opts.channel));
  if (opts.q) {
    const like = `%${opts.q}%`;
    where.push(
      or(
        ilike(messages.subject, like),
        ilike(messages.body, like),
        ilike(messages.linkRef, like),
        ilike(messages.fromText, like),
      ),
    );
  }
  return base()
    .where(and(...where))
    .orderBy(desc(messages.at))
    .limit(300);
}

/** The parties on a booking that can be written to, for the send form. */
export async function bookingRecipients(bookingId: string) {
  await requirePermission("app.discuss");
  if (!z.uuid().safeParse(bookingId).success) return [];
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b) return [];
  const roles: [string, string | null][] = [
    ["Customer", b.clientId],
    ["Payer", b.payerId],
    ["Shipper", b.shipperId],
    ["Consignee", b.consigneeId],
    ["Notify", b.notifyId],
  ];
  const ids = [...new Set(roles.map(([, id]) => id).filter((id): id is string => !!id))];
  const people = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      whatsapp: contacts.whatsapp,
      mobile: contacts.mobile,
    })
    .from(contacts)
    .where(inArray(contacts.id, ids));
  return people.map((c) => ({
    id: c.id,
    label: `${c.name} (${roles
      .filter(([, id]) => id === c.id)
      .map(([r]) => r)
      .join(", ")})`,
    email: c.email,
    whatsapp: c.whatsapp ?? c.mobile,
  }));
}

export async function routingTable() {
  await requirePermission("app.discuss");
  return readRoutes();
}

/** The routing table and the escalation delay as the editor needs them, with their versions. */
export async function routingForEdit() {
  await requirePermission("app.settings");
  const rows = await db
    .select()
    .from(configTables)
    .where(inArray(configTables.name, ["routes", "escalation"]));
  const of = (name: string) => rows.find((r) => r.name === name);
  const [routes, minutes] = await Promise.all([readRoutes(), readEscalateMinutes()]);
  return {
    routes,
    version: of("routes")?.version ?? 0,
    minutes,
    escalationVersion: of("escalation")?.version ?? 0,
  };
}

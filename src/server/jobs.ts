import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { escalationMoot, escalationTitle } from "@/domain/escalation";
import type { BookingStatus } from "@/domain/shipments";
import { env } from "@/env";
import { audit } from "./audit";
import { db } from "./db/client";
import { activities, messages } from "./db/schema";
import { readEscalateMinutes } from "./messaging";

/**
 * The scheduled work (POST /api/jobs/tick, called by the server's cron): what the legacy page
 * did on its timer. Each job is safe to run as often as wanted — it acts once per thing.
 */

const digest = (v: string) => createHash("sha256").update(v).digest();

/**
 * The cron's key, compared in constant time. Null when no key is configured: the endpoint
 * then does not exist (it never runs open).
 */
export function jobsKeyOk(authorization: string | null): boolean | null {
  if (!env.JOBS_TOKEN) return null;
  const given = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  return timingSafeEqual(digest(given), digest(env.JOBS_TOKEN));
}

type Waiting = {
  id: string;
  subject: string | null;
  body: string | null;
  linkKind: string | null;
  linkId: string | null;
  bookingStatus: BookingStatus | null;
};

/**
 * Messages nobody took in time become the Team lead's task (legacy escalateQueue): waiting in
 * the queue (incoming, unclaimed, not an answered call, nothing sent after them on the thread
 * or the record), older than the routing table's minutes, and not escalated before.
 */
export async function escalateWaiting(today: string): Promise<number> {
  const minutes = await readEscalateMinutes();
  const rows = (await db.execute(sql`
    select m.id, m.subject, m.body, m.link_kind as "linkKind", m.link_id as "linkId",
      b.status as "bookingStatus"
    from messages m
    left join bookings b on m.link_kind = 'booking' and b.id = m.link_id
    where m.direction = 'in' and m.claimed_by is null and m.archived_at is null
      and m.escalated_at is null
      and not (m.channel = 'call' and m.call_outcome = 'answered')
      and m.at <= now() - make_interval(mins => ${minutes})
      and not exists (select 1 from messages later where later.direction = 'out'
        and later.at > m.at and (later.thread_id = m.thread_id
          or (m.link_id is not null and later.link_id = m.link_id)))
    order by m.at
    limit 200`)) as unknown as Waiting[];
  let opened = 0;
  for (const m of rows) {
    await db.transaction(async (tx) => {
      await tx.update(messages).set({ escalatedAt: new Date() }).where(eq(messages.id, m.id));
      if (escalationMoot(m.bookingStatus)) return;
      const linked = m.linkKind === "booking" || m.linkKind === "quotation";
      const [task] = await tx
        .insert(activities)
        .values({
          title: escalationTitle(m.subject, m.body),
          type: "To do",
          role: "team_lead",
          due: today,
          linkKind: linked ? m.linkKind : null,
          linkId: linked ? m.linkId : null,
        })
        .returning({ id: activities.id });
      await audit(tx, {
        action: "message.escalate",
        entity: "message",
        entityId: m.id,
        detail: { task: task.id },
      });
      opened++;
    });
  }
  return opened;
}

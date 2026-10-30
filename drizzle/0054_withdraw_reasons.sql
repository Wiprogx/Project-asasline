CREATE TABLE "withdraw_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"code" text
);
--> statement-breakpoint
ALTER TABLE "cancel_reasons" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "withdraw_reason_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "withdraw_reasons_label_uq" ON "withdraw_reasons" USING btree (lower("label")) WHERE "withdraw_reasons"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "withdraw_reasons_code_uq" ON "withdraw_reasons" USING btree ("code") WHERE "withdraw_reasons"."code" is not null;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_withdraw_reason_id_withdraw_reasons_id_fk" FOREIGN KEY ("withdraw_reason_id") REFERENCES "public"."withdraw_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cancel_reasons_code_uq" ON "cancel_reasons" USING btree ("code") WHERE "cancel_reasons"."code" is not null;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered reasons.
INSERT INTO "withdraw_reasons" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'withdrawReasons' AND jsonb_typeof("value") = 'array'),
      '["No longer needed","Done outside the system","Duplicate","Wrong shipment","Other"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- The reasons the app gives by itself, by code (domain/reasons WITHDRAW_CODES); an office
-- reason with the same words becomes that coded reason.
UPDATE "withdraw_reasons" r SET "code" = s.code
FROM (VALUES
  ('booking_cancelled', 'Booking cancelled'),
  ('quotation_cancelled', 'Quotation cancelled'),
  ('rule_dropped', 'The document rule no longer applies to this booking'),
  ('box_left', 'The container left the booking')
) AS s(code, label)
WHERE lower(r."label") = lower(s.label) AND r."archived_at" IS NULL;--> statement-breakpoint
INSERT INTO "withdraw_reasons" ("label", "position", "code")
SELECT s.label, s.pos, s.code
FROM (VALUES
  ('booking_cancelled', 'Booking cancelled', 1000),
  ('quotation_cancelled', 'Quotation cancelled', 1010),
  ('rule_dropped', 'The document rule no longer applies to this booking', 1020),
  ('box_left', 'The container left the booking', 1030)
) AS s(code, label, pos)
WHERE NOT EXISTS (SELECT 1 FROM "withdraw_reasons" r WHERE r."code" = s.code);--> statement-breakpoint
UPDATE "activities" a SET "withdraw_reason_id" = r."id"
FROM "withdraw_reasons" r
WHERE a."withdraw_reason" IS NOT NULL AND (
  (r."code" = 'booking_cancelled' AND a."withdraw_reason" LIKE 'Booking cancelled:%') OR
  (r."code" = 'quotation_cancelled' AND a."withdraw_reason" LIKE 'Quotation cancelled:%')
);--> statement-breakpoint
-- A text an earlier withdrawal was given that the list no longer holds: kept as a reason of
-- its own, archived (not offered), so the tasks it names still point at their words.
INSERT INTO "withdraw_reasons" ("label", "position", "archived_at", "archived_reason")
SELECT min(btrim(a."withdraw_reason")), 2000, now(), 'No longer in the list when the reasons became a table; kept for the tasks that name it'
FROM "activities" a
WHERE a."withdraw_reason_id" IS NULL AND coalesce(btrim(a."withdraw_reason"), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "withdraw_reasons" r WHERE lower(r."label") = lower(btrim(a."withdraw_reason")))
GROUP BY lower(btrim(a."withdraw_reason"));--> statement-breakpoint
UPDATE "activities" a SET "withdraw_reason_id" = r."id"
FROM "withdraw_reasons" r
WHERE a."withdraw_reason_id" IS NULL AND lower(r."label") = lower(btrim(a."withdraw_reason"));

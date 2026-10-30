CREATE TABLE "cancel_reasons" (
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
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancel_reason_id" uuid;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "cancel_reason_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "cancel_reasons_label_uq" ON "cancel_reasons" USING btree (lower("label")) WHERE "cancel_reasons"."archived_at" is null;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancel_reason_id_cancel_reasons_id_fk" FOREIGN KEY ("cancel_reason_id") REFERENCES "public"."cancel_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_cancel_reason_id_cancel_reasons_id_fk" FOREIGN KEY ("cancel_reason_id") REFERENCES "public"."cancel_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered reasons.
INSERT INTO "cancel_reasons" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'cancelReasons' AND jsonb_typeof("value") = 'array'),
      '["Goods not ready","Price — the customer found cheaper","Customs charges too high","The customer cancelled the order","A problem with the documents","The carrier cancelled the sailing","Other"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A text an earlier cancellation was given that the list no longer holds: kept as a reason of
-- its own, archived (not offered), so the records it names still point at their words.
INSERT INTO "cancel_reasons" ("label", "position", "archived_at", "archived_reason")
SELECT min(t.label), 1000, now(), 'No longer in the list when the reasons became a table; kept for the records that name it'
FROM (
  SELECT btrim("cancel_reason") AS label FROM "bookings" WHERE coalesce(btrim("cancel_reason"), '') <> ''
  UNION ALL
  SELECT btrim("cancel_reason") FROM "quotations" WHERE coalesce(btrim("cancel_reason"), '') <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM "cancel_reasons" r WHERE lower(r."label") = lower(t.label))
GROUP BY lower(t.label);--> statement-breakpoint
UPDATE "bookings" b SET "cancel_reason_id" = r."id"
FROM "cancel_reasons" r
WHERE lower(r."label") = lower(btrim(b."cancel_reason"));--> statement-breakpoint
UPDATE "quotations" q SET "cancel_reason_id" = r."id"
FROM "cancel_reasons" r
WHERE lower(r."label") = lower(btrim(q."cancel_reason"));

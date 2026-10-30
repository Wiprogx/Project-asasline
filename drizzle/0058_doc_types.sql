CREATE TABLE "doc_types" (
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
	"code" text,
	"on_paper" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "doc_type_id" uuid;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "doc_type_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "doc_types_label_uq" ON "doc_types" USING btree (lower("label")) WHERE "doc_types"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "doc_types_code_uq" ON "doc_types" USING btree ("code") WHERE "doc_types"."code" is not null;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_doc_type_id_doc_types_id_fk" FOREIGN KEY ("doc_type_id") REFERENCES "public"."doc_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_doc_type_id_doc_types_id_fk" FOREIGN KEY ("doc_type_id") REFERENCES "public"."doc_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "doc_types" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'docTypes' AND jsonb_typeof("value") = 'array'),
      '["SEA WAYBILL","ORIGINAL BL","EXPRESS RELEASE","TELEX RELEASE","AIR WAYBILL","CMR"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A value a record holds that the list does not: kept as a row of its own, archived (not
-- offered), so the record still points at its words.
INSERT INTO "doc_types" ("label", "position", "archived_at", "archived_reason")
SELECT min(t.label), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT btrim("doc_type") AS label FROM "bookings" WHERE coalesce(btrim("doc_type"), '') <> ''
  UNION ALL
  SELECT btrim("doc_type") AS label FROM "quotations" WHERE coalesce(btrim("doc_type"), '') <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM "doc_types" r WHERE lower(r."label") = lower(t.label))
GROUP BY lower(t.label);--> statement-breakpoint
UPDATE "bookings" x SET "doc_type_id" = r."id"
FROM "doc_types" r
WHERE lower(r."label") = lower(btrim(x."doc_type"));--> statement-breakpoint
UPDATE "quotations" x SET "doc_type_id" = r."id"
FROM "doc_types" r
WHERE lower(r."label") = lower(btrim(x."doc_type"));--> statement-breakpoint
-- A new booking starts with SEA WAYBILL: coded, so the app finds it whatever it is renamed to.
INSERT INTO "doc_types" ("label", "position")
SELECT 'SEA WAYBILL', 5
WHERE NOT EXISTS (SELECT 1 FROM "doc_types" WHERE lower("label") = 'sea waybill' AND "archived_at" IS NULL);--> statement-breakpoint
UPDATE "doc_types" SET "code" = 'sea_waybill'
WHERE lower("label") = 'sea waybill' AND "archived_at" IS NULL;--> statement-breakpoint
-- Paper documents (legacy PAPER_DOCS, Settings › Lists › Paper documents): a document whose
-- name holds one of them travels on paper, as the Tracking tab read it until now.
UPDATE "doc_types" d SET "on_paper" = true
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'paperDocs' AND jsonb_typeof("value") = 'array'),
      '["ORIGINAL BL","CMR"]'::jsonb
    )
  ) p(name)
  WHERE btrim(p.name) <> '' AND upper(d."label") LIKE '%' || upper(btrim(p.name)) || '%'
);--> statement-breakpoint
-- Every booking carries a document: one saved without points at SEA WAYBILL.
UPDATE "bookings" SET "doc_type_id" = (SELECT "id" FROM "doc_types" WHERE "code" = 'sea_waybill')
WHERE "doc_type_id" IS NULL;
CREATE TABLE "contact_doc_kinds" (
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
ALTER TABLE "contact_files" ADD COLUMN "kind_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_doc_kinds_label_uq" ON "contact_doc_kinds" USING btree (lower("label")) WHERE "contact_doc_kinds"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_doc_kinds_code_uq" ON "contact_doc_kinds" USING btree ("code") WHERE "contact_doc_kinds"."code" is not null;--> statement-breakpoint
ALTER TABLE "contact_files" ADD CONSTRAINT "contact_files_kind_id_contact_doc_kinds_id_fk" FOREIGN KEY ("kind_id") REFERENCES "public"."contact_doc_kinds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "contact_doc_kinds" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'contactDocTypes' AND jsonb_typeof("value") = 'array'),
      '["Contract","Power of attorney","Passport or ID","Other"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A value a record holds that the list does not: kept as a row of its own, archived (not
-- offered), so the record still points at its words.
INSERT INTO "contact_doc_kinds" ("label", "position", "archived_at", "archived_reason")
SELECT min(t.label), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT btrim("kind") AS label FROM "contact_files" WHERE coalesce(btrim("kind"), '') <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM "contact_doc_kinds" r WHERE lower(r."label") = lower(t.label))
GROUP BY lower(t.label);--> statement-breakpoint
UPDATE "contact_files" x SET "kind_id" = r."id"
FROM "contact_doc_kinds" r
WHERE lower(r."label") = lower(btrim(x."kind"));
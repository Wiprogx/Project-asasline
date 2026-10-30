CREATE TABLE "salutations" (
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
ALTER TABLE "contacts" ADD COLUMN "salutation_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "salutations_label_uq" ON "salutations" USING btree (lower("label")) WHERE "salutations"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "salutations_code_uq" ON "salutations" USING btree ("code") WHERE "salutations"."code" is not null;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_salutation_id_salutations_id_fk" FOREIGN KEY ("salutation_id") REFERENCES "public"."salutations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "salutations" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'salutations' AND jsonb_typeof("value") = 'array'),
      '["Mr","Mrs","Ms","Dr"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A value a record holds that the list does not: kept as a row of its own, archived (not
-- offered), so the record still points at its words.
INSERT INTO "salutations" ("label", "position", "archived_at", "archived_reason")
SELECT min(t.label), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT btrim("salutation") AS label FROM "contacts" WHERE coalesce(btrim("salutation"), '') <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM "salutations" r WHERE lower(r."label") = lower(t.label))
GROUP BY lower(t.label);--> statement-breakpoint
UPDATE "contacts" x SET "salutation_id" = r."id"
FROM "salutations" r
WHERE lower(r."label") = lower(btrim(x."salutation"));
CREATE TABLE "task_types" (
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
ALTER TABLE "activities" ADD COLUMN "type_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "task_types_label_uq" ON "task_types" USING btree (lower("label")) WHERE "task_types"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "task_types_code_uq" ON "task_types" USING btree ("code") WHERE "task_types"."code" is not null;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_type_id_task_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."task_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "task_types" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'activityTypes' AND jsonb_typeof("value") = 'array'),
      '["Email","Call","Upload a document","To do","Meeting","Approve","Reminder"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A value a record holds that the list does not: kept as a row of its own, archived (not
-- offered), so the record still points at its words.
INSERT INTO "task_types" ("label", "position", "archived_at", "archived_reason")
SELECT min(t.label), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT btrim("type") AS label FROM "activities" WHERE coalesce(btrim("type"), '') <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM "task_types" r WHERE lower(r."label") = lower(t.label))
GROUP BY lower(t.label);--> statement-breakpoint
UPDATE "activities" x SET "type_id" = r."id"
FROM "task_types" r
WHERE lower(r."label") = lower(btrim(x."type"));--> statement-breakpoint
-- The kinds the app opens by itself, coded so it finds them whatever they are renamed to.
INSERT INTO "task_types" ("label", "position")
SELECT s.label, s.pos FROM (VALUES ('To do', 5), ('Call', 6)) AS s(label, pos)
WHERE NOT EXISTS (SELECT 1 FROM "task_types" WHERE lower("label") = lower(s.label) AND "archived_at" IS NULL);--> statement-breakpoint
UPDATE "task_types" SET "code" = 'to_do' WHERE lower("label") = 'to do' AND "archived_at" IS NULL;--> statement-breakpoint
UPDATE "task_types" SET "code" = 'call' WHERE lower("label") = 'call' AND "archived_at" IS NULL;

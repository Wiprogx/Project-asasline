CREATE TABLE "container_types" (
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
ALTER TABLE "containers" ADD COLUMN "type_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD COLUMN "container_type_id" uuid;--> statement-breakpoint
ALTER TABLE "rate_items" ADD COLUMN "container_type_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "container_types_label_uq" ON "container_types" USING btree (lower("label")) WHERE "container_types"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "container_types_code_uq" ON "container_types" USING btree ("code") WHERE "container_types"."code" is not null;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_type_id_container_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."container_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD CONSTRAINT "quotation_routes_container_type_id_container_types_id_fk" FOREIGN KEY ("container_type_id") REFERENCES "public"."container_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_items" ADD CONSTRAINT "rate_items_container_type_id_container_types_id_fk" FOREIGN KEY ("container_type_id") REFERENCES "public"."container_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "container_types" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'containerTypes' AND jsonb_typeof("value") = 'array'),
      '["20DV","40DV","40HC","45HC","20RF","40RF"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A code a record holds that the list does not: codes in use were working values, so each
-- becomes an offered row at the end (a catalogue item for 20OT keeps its box).
INSERT INTO "container_types" ("label", "position")
SELECT min(w.code), 5000
FROM (
  SELECT upper(btrim("type")) AS code FROM "containers"
  UNION ALL SELECT upper(btrim("container_type")) FROM "quotation_routes"
  UNION ALL SELECT upper(btrim("container_type")) FROM "rate_items"
) w
WHERE coalesce(w.code, '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "container_types" r WHERE lower(r."label") = lower(w.code))
GROUP BY lower(w.code);--> statement-breakpoint
-- A new box starts as a 40HC: coded, so the app finds it whatever it is renamed to.
INSERT INTO "container_types" ("label", "position")
SELECT '40HC', 25
WHERE NOT EXISTS (SELECT 1 FROM "container_types" WHERE lower("label") = '40hc' AND "archived_at" IS NULL);--> statement-breakpoint
UPDATE "container_types" SET "code" = 'default_box' WHERE lower("label") = '40hc' AND "archived_at" IS NULL;--> statement-breakpoint
UPDATE "containers" x SET "type_id" = r."id" FROM "container_types" r
WHERE lower(r."label") = lower(btrim(x."type")) AND r."archived_at" IS NULL;--> statement-breakpoint
UPDATE "quotation_routes" x SET "container_type_id" = r."id" FROM "container_types" r
WHERE lower(r."label") = lower(btrim(x."container_type")) AND r."archived_at" IS NULL;--> statement-breakpoint
UPDATE "rate_items" x SET "container_type_id" = r."id" FROM "container_types" r
WHERE lower(r."label") = lower(btrim(x."container_type")) AND r."archived_at" IS NULL;--> statement-breakpoint
UPDATE "containers" SET "type_id" = (SELECT "id" FROM "container_types" WHERE "code" = 'default_box')
WHERE "type_id" IS NULL;

CREATE TABLE "package_types" (
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
CREATE TABLE "seal_sources" (
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
CREATE TABLE "container_hs_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"container_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"code" text NOT NULL,
	"weight_kg" integer,
	"packages" integer,
	"package_type_id" uuid
);
--> statement-breakpoint
CREATE TABLE "container_seals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"container_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"number" text NOT NULL,
	"source_id" uuid
);
--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "package_type_id" uuid;--> statement-breakpoint
ALTER TABLE "container_hs_lines" ADD CONSTRAINT "container_hs_lines_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_hs_lines" ADD CONSTRAINT "container_hs_lines_package_type_id_package_types_id_fk" FOREIGN KEY ("package_type_id") REFERENCES "public"."package_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_seals" ADD CONSTRAINT "container_seals_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_seals" ADD CONSTRAINT "container_seals_source_id_seal_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."seal_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "package_types_label_uq" ON "package_types" USING btree (lower("label")) WHERE "package_types"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "package_types_code_uq" ON "package_types" USING btree ("code") WHERE "package_types"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "seal_sources_label_uq" ON "seal_sources" USING btree (lower("label")) WHERE "seal_sources"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "seal_sources_code_uq" ON "seal_sources" USING btree ("code") WHERE "seal_sources"."code" is not null;--> statement-breakpoint
CREATE INDEX "container_hs_lines_container_idx" ON "container_hs_lines" USING btree ("container_id");--> statement-breakpoint
CREATE INDEX "container_seals_container_idx" ON "container_seals" USING btree ("container_id");--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_package_type_id_package_types_id_fk" FOREIGN KEY ("package_type_id") REFERENCES "public"."package_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "package_types" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'packageTypes' AND jsonb_typeof("value") = 'array'),
      '["Bags","Bales","Barrels","Big bags (FIBC)","Boxes","Bundles","Cartons","Cases","Coils","Crates","Drums","Jerricans","Pallets","Packages","Pieces","Reels","Rolls","Sacks","Skids","Loose / unpacked"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A value a record holds that the list does not: kept as a row of its own, archived (not
-- offered), so the record still points at its words.
INSERT INTO "package_types" ("label", "position", "archived_at", "archived_reason")
SELECT min(t.label), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT btrim("package_type") AS label FROM "containers" WHERE coalesce(btrim("package_type"), '') <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM "package_types" r WHERE lower(r."label") = lower(t.label))
GROUP BY lower(t.label);--> statement-breakpoint
UPDATE "containers" x SET "package_type_id" = r."id"
FROM "package_types" r
WHERE lower(r."label") = lower(btrim(x."package_type"));--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "seal_sources" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'sealSources' AND jsonb_typeof("value") = 'array'),
      '["Trucker","Carrier","Customs","Shipper","Terminal","Other"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A package type an HS line names that the list does not hold: archived, kept for the line.
INSERT INTO "package_types" ("label", "position", "archived_at", "archived_reason")
SELECT min(btrim(l->>'packageType')), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM "containers" c, jsonb_array_elements(c."hs_lines") l
WHERE coalesce(btrim(l->>'packageType'), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "package_types" r WHERE lower(r."label") = lower(btrim(l->>'packageType')))
GROUP BY lower(btrim(l->>'packageType'));--> statement-breakpoint
-- Each HS line becomes a row, in its order, pointing at its package type.
INSERT INTO "container_hs_lines" ("container_id", "position", "code", "weight_kg", "packages", "package_type_id", "created_at", "updated_at")
SELECT c."id", l.ord - 1, l.v->>'code',
  CASE WHEN jsonb_typeof(l.v->'weightKg') = 'number' THEN (l.v->>'weightKg')::numeric::int END,
  CASE WHEN jsonb_typeof(l.v->'packages') = 'number' THEN (l.v->>'packages')::numeric::int END,
  (SELECT r."id" FROM "package_types" r WHERE lower(r."label") = lower(btrim(l.v->>'packageType'))
    ORDER BY r."archived_at" IS NOT NULL LIMIT 1),
  c."created_at", c."updated_at"
FROM "containers" c, jsonb_array_elements(c."hs_lines") WITH ORDINALITY AS l(v, ord)
WHERE coalesce(l.v->>'code', '') <> '';--> statement-breakpoint
-- A seal source a box names that the list does not hold: archived, kept for the seal.
INSERT INTO "seal_sources" ("label", "position", "archived_at", "archived_reason")
SELECT min(m.src), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT btrim((regexp_match(s, '^(.*?)\s*\(([^()]+)\)\s*$'))[2]) AS src
  FROM "containers" c, unnest(c."seals") s
) m
WHERE coalesce(m.src, '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "seal_sources" r WHERE lower(r."label") = lower(m.src))
GROUP BY lower(m.src);--> statement-breakpoint
-- Each seal ("ABC1234 (Carrier)") becomes a row, in its order: its number and its source.
INSERT INTO "container_seals" ("container_id", "position", "number", "source_id", "created_at", "updated_at")
SELECT x.cid, x.ord - 1,
  coalesce(btrim((regexp_match(x.s, '^(.*?)\s*\(([^()]+)\)\s*$'))[1]), btrim(x.s)),
  (SELECT r."id" FROM "seal_sources" r
    WHERE lower(r."label") = lower(btrim((regexp_match(x.s, '^(.*?)\s*\(([^()]+)\)\s*$'))[2]))
    ORDER BY r."archived_at" IS NOT NULL LIMIT 1),
  x.created_at, x.updated_at
FROM (
  SELECT c."id" AS cid, c."created_at", c."updated_at", s, ord
  FROM "containers" c, unnest(c."seals") WITH ORDINALITY AS u(s, ord)
) x
WHERE btrim(x.s) <> '';

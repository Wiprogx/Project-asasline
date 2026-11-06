CREATE TABLE "box_owners" (
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
	"owner" text NOT NULL,
	"carrier_id" uuid
);
--> statement-breakpoint
ALTER TABLE "container_types" ADD COLUMN "tare_kg" integer;--> statement-breakpoint
ALTER TABLE "container_types" ADD COLUMN "max_gross_kg" integer;--> statement-breakpoint
ALTER TABLE "box_owners" ADD CONSTRAINT "box_owners_carrier_id_contacts_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "box_owners_label_uq" ON "box_owners" USING btree (lower("label")) WHERE "box_owners"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "box_owners_code_uq" ON "box_owners" USING btree ("code") WHERE "box_owners"."code" is not null;--> statement-breakpoint
-- The tare and maximum gross each type had in code (legacy CONTAINER_TARE / CONTAINER_MAX), by
-- its words; a type the office added itself keeps none until it is given them.
UPDATE "container_types" t SET "tare_kg" = d.tare, "max_gross_kg" = d.max
FROM (VALUES
  ('20DV', 2250, 30480), ('40DV', 3750, 32500), ('40HC', 3900, 32500), ('45HC', 4800, 32500),
  ('20RF', 3000, 30480), ('40RF', 4800, 32500), ('20OT', 2400, 30480), ('40OT', 4100, 32500),
  ('40FR', 5000, 45000)
) AS d(type, tare, max)
WHERE upper(btrim(t."label")) = d.type;--> statement-breakpoint
-- The specs Settings › Containers saved (the retired "containerSpecs" row) win over the built-in ones.
UPDATE "container_types" t
SET "tare_kg" = (e.value->>'tareKg')::int, "max_gross_kg" = (e.value->>'maxGrossKg')::int
FROM jsonb_array_elements(
  coalesce(
    (SELECT "value" FROM "config_tables" WHERE "name" = 'containerSpecs' AND jsonb_typeof("value") = 'array'),
    '[]'::jsonb
  )
) AS e(value)
WHERE upper(btrim(t."label")) = upper(e.value->>'type')
  AND (e.value->>'tareKg') ~ '^[0-9]+$' AND (e.value->>'maxGrossKg') ~ '^[0-9]+$';--> statement-breakpoint
-- The box owners Settings saved (the retired "boxOwners" row), or the built-in prefixes
-- (legacy BOX_OWNERS), in their order, become the rows of Settings › Lists › Box owners.
INSERT INTO "box_owners" ("label", "owner", "position")
SELECT DISTINCT ON (upper(btrim(e.value->>'prefix'))) upper(btrim(e.value->>'prefix')), btrim(e.value->>'owner'), e.ordinality * 10
FROM jsonb_array_elements(
  coalesce(
    (SELECT "value" FROM "config_tables" WHERE "name" = 'boxOwners' AND jsonb_typeof("value") = 'array'),
    '[{"prefix":"MSCU","owner":"MSC"},{"prefix":"MSBU","owner":"MSC"},{"prefix":"MEDU","owner":"MSC"},{"prefix":"MSDU","owner":"MSC"},{"prefix":"MAEU","owner":"Maersk"},{"prefix":"MSKU","owner":"Maersk"},{"prefix":"MRKU","owner":"Maersk"},{"prefix":"MMAU","owner":"Maersk"},{"prefix":"CMAU","owner":"CMA CGM"},{"prefix":"ECMU","owner":"CMA CGM"},{"prefix":"CGMU","owner":"CMA CGM"},{"prefix":"APZU","owner":"CMA CGM"},{"prefix":"HLXU","owner":"Hapag-Lloyd"},{"prefix":"HLBU","owner":"Hapag-Lloyd"},{"prefix":"UACU","owner":"Hapag-Lloyd"},{"prefix":"HMMU","owner":"HMM"},{"prefix":"HDMU","owner":"HMM"},{"prefix":"COSU","owner":"COSCO"},{"prefix":"CBHU","owner":"COSCO"},{"prefix":"CCLU","owner":"COSCO"},{"prefix":"OOLU","owner":"OOCL"},{"prefix":"OOCU","owner":"OOCL"},{"prefix":"ONEU","owner":"ONE"},{"prefix":"EGHU","owner":"Evergreen"},{"prefix":"EISU","owner":"Evergreen"},{"prefix":"EMCU","owner":"Evergreen"},{"prefix":"YMLU","owner":"Yang Ming"},{"prefix":"ZIMU","owner":"ZIM"},{"prefix":"TCLU","owner":"Triton (leased)"},{"prefix":"TCNU","owner":"Triton (leased)"},{"prefix":"TGHU","owner":"Textainer (leased)"},{"prefix":"CAIU","owner":"CAI (leased)"},{"prefix":"SEGU","owner":"Seaco (leased)"},{"prefix":"BMOU","owner":"Beacon (leased)"},{"prefix":"FCIU","owner":"Florens (leased)"},{"prefix":"GESU","owner":"GE Seaco (leased)"}]'::jsonb
  )
) WITH ORDINALITY AS e(value, ordinality)
WHERE upper(btrim(e.value->>'prefix')) ~ '^[A-Z]{4}$' AND btrim(coalesce(e.value->>'owner', '')) <> ''
ORDER BY upper(btrim(e.value->>'prefix')), e.ordinality;

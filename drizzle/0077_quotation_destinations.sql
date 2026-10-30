CREATE TYPE "public"."route_service" AS ENUM('port_port', 'door_port');--> statement-breakpoint
CREATE TABLE "quotation_commodities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"quotation_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"code" text NOT NULL,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "display" SET DEFAULT 'inclusive';--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD COLUMN "service" "route_service" DEFAULT 'port_port' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD COLUMN "lane_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD COLUMN "load_address_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD COLUMN "stops" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_commodities" ADD CONSTRAINT "quotation_commodities_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_commodities_quotation_idx" ON "quotation_commodities" USING btree ("quotation_id","position");--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD CONSTRAINT "quotation_routes_lane_id_rate_items_id_fk" FOREIGN KEY ("lane_id") REFERENCES "public"."rate_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD CONSTRAINT "quotation_routes_load_address_id_contacts_id_fk" FOREIGN KEY ("load_address_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A destination built from an ocean leg remembers it: the catalogue item of its ocean line.
UPDATE "quotation_routes" r SET "lane_id" = x."item_id"
FROM (
  SELECT DISTINCT ON (l."route_id") l."route_id", l."item_id"
  FROM "quotation_lines" l JOIN "rate_items" i ON i."id" = l."item_id"
  WHERE i."category" = 'ocean' AND l."archived_at" IS NULL
  ORDER BY l."route_id", l."position", l."created_at"
) x
WHERE x."route_id" = r."id" AND r."lane_id" IS NULL;
--> statement-breakpoint
-- A commodity typed as words that begins with an HS code becomes its first row (630900 Worn clothes).
INSERT INTO "quotation_commodities" ("quotation_id", "position", "code", "description")
SELECT q."id", 0, substring(btrim(q."commodity") from '^(\d{4,10})'),
  nullif(btrim(regexp_replace(btrim(q."commodity"), '^\d{4,10}\s*[-–:]?\s*', '')), '')
FROM "quotations" q
WHERE btrim(coalesce(q."commodity", '')) ~ '^\d{4,10}';

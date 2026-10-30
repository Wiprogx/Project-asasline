CREATE TABLE "professions" (
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
CREATE TABLE "tags" (
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
CREATE TABLE "contact_professions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"contact_id" uuid NOT NULL,
	"profession_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_professions" ADD CONSTRAINT "contact_professions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_professions" ADD CONSTRAINT "contact_professions_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professions_label_uq" ON "professions" USING btree (lower("label")) WHERE "professions"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "professions_code_uq" ON "professions" USING btree ("code") WHERE "professions"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_label_uq" ON "tags" USING btree (lower("label")) WHERE "tags"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_code_uq" ON "tags" USING btree ("code") WHERE "tags"."code" is not null;--> statement-breakpoint
CREATE INDEX "contact_professions_contact_idx" ON "contact_professions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_tags_contact_idx" ON "contact_tags" USING btree ("contact_id");--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "professions" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'professions' AND jsonb_typeof("value") = 'array'),
      '["Freight forwarder", "Transporter", "Carrier", "Forwarder", "Customs", "Terminal / depot", "Warehousing", "Insurance", "Inspection & survey", "Fumigation", "Container repair", "Ship agency", "Lashing & securing", "Weighing (VGM)", "Bank / finance", "Agricultural products", "Apparel", "Auto parts", "Automotive / vehicles", "Bags & luggage", "Batteries", "Beverages", "Building materials", "Cables & wiring", "Ceramics & tiles", "Chemicals", "Coffee & tea", "Confectionery", "Construction equipment", "Consumer electronics", "Cosmetics & perfume", "Dairy products", "Detergents & cleaning", "Electronics", "Farm machinery", "Fertilisers", "Fish & seafood", "Foodstuffs", "Footwear", "Frozen goods", "Fruit & vegetables", "Furniture", "General trading", "Generators", "Glassware", "Hardware & tools", "Home appliances", "Household goods", "Industrial machinery", "IT equipment", "Leather goods", "Lubricants & oils", "Marble & granite", "Medical supplies", "Metals & scrap", "Mobile phones", "Packaging materials", "Paint & coatings", "Paper & cardboard", "Personal effects / removals", "Pharmaceuticals", "Plastics & resins", "Printing supplies", "Rice & grains", "Rubber & tyres", "Sanitary ware", "Seeds", "Solar equipment", "Spare parts", "Sports goods", "Stationery", "Steel products", "Sugar", "Textiles", "Timber & wood", "Tobacco", "Toys", "Used clothing", "Used tyres", "Used vehicles", "Vegetable oil", "Water treatment equipment", "Wheat & flour"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "tags" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'contactTags' AND jsonb_typeof("value") = 'array'),
      '["B2B", "Key account", "Agent", "Terminal", "Depot", "Pick up", "Doc Check", "Watch payments"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- A word a contact holds that the list does not: these lists are open (offered as one types),
-- so it becomes an offered row at the end, in the order first met.
INSERT INTO "professions" ("label", "position")
SELECT min(w.word), 5000
FROM (SELECT btrim(x) AS word FROM "contacts" c, unnest(c."professions") x) w
WHERE w.word <> '' AND NOT EXISTS (SELECT 1 FROM "professions" r WHERE lower(r."label") = lower(w.word))
GROUP BY lower(w.word);--> statement-breakpoint
INSERT INTO "contact_professions" ("contact_id", "profession_id", "created_at", "updated_at")
SELECT DISTINCT ON (c."id", r."id") c."id", r."id", c."created_at", c."updated_at"
FROM "contacts" c, unnest(c."professions") x
JOIN "professions" r ON lower(r."label") = lower(btrim(x)) AND r."archived_at" IS NULL
WHERE btrim(x) <> '';--> statement-breakpoint
-- A word a contact holds that the list does not: these lists are open (offered as one types),
-- so it becomes an offered row at the end, in the order first met.
INSERT INTO "tags" ("label", "position")
SELECT min(w.word), 5000
FROM (SELECT btrim(x) AS word FROM "contacts" c, unnest(c."tags") x) w
WHERE w.word <> '' AND NOT EXISTS (SELECT 1 FROM "tags" r WHERE lower(r."label") = lower(w.word))
GROUP BY lower(w.word);--> statement-breakpoint
INSERT INTO "contact_tags" ("contact_id", "tag_id", "created_at", "updated_at")
SELECT DISTINCT ON (c."id", r."id") c."id", r."id", c."created_at", c."updated_at"
FROM "contacts" c, unnest(c."tags") x
JOIN "tags" r ON lower(r."label") = lower(btrim(x)) AND r."archived_at" IS NULL
WHERE btrim(x) <> '';
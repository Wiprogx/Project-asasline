CREATE TABLE "location_roles" (
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
CREATE TABLE "person_roles" (
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
ALTER TABLE "contact_links" ADD COLUMN "person_role_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_links" ADD COLUMN "location_role_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "location_roles_label_uq" ON "location_roles" USING btree (lower("label")) WHERE "location_roles"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "location_roles_code_uq" ON "location_roles" USING btree ("code") WHERE "location_roles"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "person_roles_label_uq" ON "person_roles" USING btree (lower("label")) WHERE "person_roles"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "person_roles_code_uq" ON "person_roles" USING btree ("code") WHERE "person_roles"."code" is not null;--> statement-breakpoint
ALTER TABLE "contact_links" ADD CONSTRAINT "contact_links_person_role_id_person_roles_id_fk" FOREIGN KEY ("person_role_id") REFERENCES "public"."person_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_links" ADD CONSTRAINT "contact_links_location_role_id_location_roles_id_fk" FOREIGN KEY ("location_role_id") REFERENCES "public"."location_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "person_roles" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'personRoles' AND jsonb_typeof("value") = 'array'),
      '["Contact","Director","Accounting","Operations","Sales","Doc Check"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- The list Settings saved (or the built-in one), in its order, becomes the offered rows.
INSERT INTO "location_roles" ("label", "position")
SELECT DISTINCT ON (lower(btrim(w.label))) btrim(w.label), w.pos * 10
FROM (
  SELECT e.value AS label, e.ordinality AS pos
  FROM jsonb_array_elements_text(
    coalesce(
      (SELECT "value" FROM "config_tables" WHERE "name" = 'addressTypes' AND jsonb_typeof("value") = 'array'),
      '["Doc Check","Contact","Invoicing address","Delivery address","Shipper","Consignee","Notify Party","Weight address","Terminal","Depot","Other address"]'::jsonb
    )
  ) WITH ORDINALITY AS e(value, ordinality)
) w
WHERE btrim(w.label) <> ''
ORDER BY lower(btrim(w.label)), w.pos;--> statement-breakpoint
-- Each link's role is a location's when either end is a location, else a person's; a role
-- the list does not hold is kept as an archived row of the list it belongs to.
INSERT INTO "person_roles" ("label", "position", "archived_at", "archived_reason")
SELECT min(k.role), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT l."id", btrim(l."role") AS role,
    CASE WHEN a."type" = 'location' OR b."type" = 'location' THEN 'location' ELSE 'person' END AS kind
  FROM "contact_links" l
  JOIN "contacts" a ON a."id" = l."contact_id"
  JOIN "contacts" b ON b."id" = l."linked_id"
) k
WHERE k.kind = 'person' AND k.role <> ''
  AND NOT EXISTS (SELECT 1 FROM "person_roles" r WHERE lower(r."label") = lower(k.role))
GROUP BY lower(k.role);--> statement-breakpoint
INSERT INTO "location_roles" ("label", "position", "archived_at", "archived_reason")
SELECT min(k.role), 10000, now(), 'Not in the list when it became a table; kept for the records that name it'
FROM (
  SELECT l."id", btrim(l."role") AS role,
    CASE WHEN a."type" = 'location' OR b."type" = 'location' THEN 'location' ELSE 'person' END AS kind
  FROM "contact_links" l
  JOIN "contacts" a ON a."id" = l."contact_id"
  JOIN "contacts" b ON b."id" = l."linked_id"
) k
WHERE k.kind = 'location' AND k.role <> ''
  AND NOT EXISTS (SELECT 1 FROM "location_roles" r WHERE lower(r."label") = lower(k.role))
GROUP BY lower(k.role);--> statement-breakpoint
UPDATE "contact_links" l SET "person_role_id" = (
  SELECT r."id" FROM "person_roles" r WHERE lower(r."label") = lower(k.role)
  ORDER BY r."archived_at" IS NOT NULL LIMIT 1)
FROM (
  SELECT l."id", btrim(l."role") AS role,
    CASE WHEN a."type" = 'location' OR b."type" = 'location' THEN 'location' ELSE 'person' END AS kind
  FROM "contact_links" l
  JOIN "contacts" a ON a."id" = l."contact_id"
  JOIN "contacts" b ON b."id" = l."linked_id"
) k WHERE k."id" = l."id" AND k.kind = 'person';--> statement-breakpoint
UPDATE "contact_links" l SET "location_role_id" = (
  SELECT r."id" FROM "location_roles" r WHERE lower(r."label") = lower(k.role)
  ORDER BY r."archived_at" IS NOT NULL LIMIT 1)
FROM (
  SELECT l."id", btrim(l."role") AS role,
    CASE WHEN a."type" = 'location' OR b."type" = 'location' THEN 'location' ELSE 'person' END AS kind
  FROM "contact_links" l
  JOIN "contacts" a ON a."id" = l."contact_id"
  JOIN "contacts" b ON b."id" = l."linked_id"
) k WHERE k."id" = l."id" AND k.kind = 'location';

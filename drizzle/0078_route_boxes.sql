ALTER TABLE "quotation_routes" ADD COLUMN "box_details" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- A loading address is the customer's delivery address: the role the app relies on gets its code.
UPDATE "location_roles" SET "code" = 'delivery'
WHERE lower("label") = 'delivery address' AND "archived_at" IS NULL AND "code" IS NULL;
--> statement-breakpoint
INSERT INTO "location_roles" ("label", "position", "code")
SELECT 'Delivery address', 40, 'delivery'
WHERE NOT EXISTS (SELECT 1 FROM "location_roles" WHERE "code" = 'delivery');

ALTER TABLE "bookings" ADD COLUMN "pickup_depot_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "terminal_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pickup_depot_id_contacts_id_fk" FOREIGN KEY ("pickup_depot_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_terminal_id_contacts_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A line's depots and terminals are the roles the app relies on: each gets its code (as 0078 did for delivery).
UPDATE "location_roles" SET "code" = 'depot'
WHERE lower("label") = 'depot' AND "archived_at" IS NULL AND "code" IS NULL;
--> statement-breakpoint
INSERT INTO "location_roles" ("label", "position", "code")
SELECT 'Depot', 100, 'depot'
WHERE NOT EXISTS (SELECT 1 FROM "location_roles" WHERE "code" = 'depot');
--> statement-breakpoint
UPDATE "location_roles" SET "code" = 'terminal'
WHERE lower("label") = 'terminal' AND "archived_at" IS NULL AND "code" IS NULL;
--> statement-breakpoint
INSERT INTO "location_roles" ("label", "position", "code")
SELECT 'Terminal', 90, 'terminal'
WHERE NOT EXISTS (SELECT 1 FROM "location_roles" WHERE "code" = 'terminal');

ALTER TABLE "bookings" ADD COLUMN "quotation_route_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotation_route_id_quotation_routes_id_fk" FOREIGN KEY ("quotation_route_id") REFERENCES "public"."quotation_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Bookings made before a quotation could have several destinations shipped its first one.
UPDATE "bookings" b SET "quotation_route_id" = (SELECT r."id" FROM "quotation_routes" r WHERE r."quotation_id" = b."quotation_id" AND r."declined" = false ORDER BY r."position", r."created_at" LIMIT 1) WHERE b."quotation_id" IS NOT NULL AND b."quotation_route_id" IS NULL;

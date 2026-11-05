ALTER TABLE "containers" ADD COLUMN "pickup_depot_id" uuid;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "pickup_date" date;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_pickup_depot_id_contacts_id_fk" FOREIGN KEY ("pickup_depot_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
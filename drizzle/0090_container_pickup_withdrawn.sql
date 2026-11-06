ALTER TABLE "containers" DROP CONSTRAINT "containers_pickup_depot_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "containers" DROP COLUMN "pickup_depot_id";--> statement-breakpoint
ALTER TABLE "containers" DROP COLUMN "pickup_date";
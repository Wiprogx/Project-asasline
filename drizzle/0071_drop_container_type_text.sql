ALTER TABLE "containers" ALTER COLUMN "type_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "containers" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "quotation_routes" DROP COLUMN "container_type";--> statement-breakpoint
ALTER TABLE "rate_items" DROP COLUMN "container_type";
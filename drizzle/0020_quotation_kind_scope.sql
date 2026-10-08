ALTER TABLE "quotations" ADD COLUMN "kind" "shipment_kind" DEFAULT 'export' NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_items" ADD COLUMN "scope" text;
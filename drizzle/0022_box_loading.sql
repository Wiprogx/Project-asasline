ALTER TABLE "bookings" ADD COLUMN "loading_mode" text;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "load_address" text;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "load_date" date;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "load_time" text;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "loading_mode" text;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "transporter_id" uuid;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "pick_back_date" date;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "pick_back_time" text;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "stops" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD COLUMN "loading_mode" text;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_transporter_id_contacts_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
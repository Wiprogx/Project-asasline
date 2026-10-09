ALTER TABLE "bookings" ADD COLUMN "release" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "release_by_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "release_note" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "doc_receiver_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "send_mode" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "send_date" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "send_tracking" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "track" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_release_by_id_contacts_id_fk" FOREIGN KEY ("release_by_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_doc_receiver_id_contacts_id_fk" FOREIGN KEY ("doc_receiver_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bookings" ADD COLUMN "doc_check_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "shipping_co_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "transporter_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "dest_forwarder_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "forwarder_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "customs_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pickup_depot" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pickup_date" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "terminal" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "originals_pickup" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "originals_requested_on" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_doc_check_id_contacts_id_fk" FOREIGN KEY ("doc_check_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shipping_co_id_contacts_id_fk" FOREIGN KEY ("shipping_co_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_transporter_id_contacts_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dest_forwarder_id_contacts_id_fk" FOREIGN KEY ("dest_forwarder_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_forwarder_id_contacts_id_fk" FOREIGN KEY ("forwarder_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customs_agent_id_contacts_id_fk" FOREIGN KEY ("customs_agent_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
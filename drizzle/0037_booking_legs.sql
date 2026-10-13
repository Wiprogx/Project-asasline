CREATE TABLE "booking_legs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"vessel_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "booking_legs" ADD CONSTRAINT "booking_legs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_legs" ADD CONSTRAINT "booking_legs_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_legs_booking_idx" ON "booking_legs" USING btree ("booking_id","position");--> statement-breakpoint
CREATE INDEX "booking_legs_vessel_idx" ON "booking_legs" USING btree ("vessel_id");
CREATE TABLE "booking_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"booking_id" uuid NOT NULL,
	"container_id" uuid,
	"name" text NOT NULL,
	"stored_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"code" text,
	"stage" text DEFAULT 'final' NOT NULL,
	"rule_code" text,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "booking_files" ADD CONSTRAINT "booking_files_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_files" ADD CONSTRAINT "booking_files_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_files_booking_idx" ON "booking_files" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_files_stored_uq" ON "booking_files" USING btree ("booking_id","stored_name");
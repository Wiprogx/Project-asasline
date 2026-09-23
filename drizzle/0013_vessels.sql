CREATE TYPE "public"."vessel_status" AS ENUM('scheduled', 'sailed', 'arrived', 'delayed', 'omitted');--> statement-breakpoint
CREATE TABLE "vessels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"name" text NOT NULL,
	"imo" text,
	"carrier" text,
	"service" text,
	"voyage" text NOT NULL,
	"pol" text,
	"pod" text,
	"etd" date,
	"eta" date,
	"atd" date,
	"ata" date,
	"status" "vessel_status" DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "vessel_id" uuid;--> statement-breakpoint
CREATE INDEX "vessels_etd_idx" ON "vessels" USING btree ("etd");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE no action ON UPDATE no action;
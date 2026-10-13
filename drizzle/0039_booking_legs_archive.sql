ALTER TABLE "booking_legs" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking_legs" ADD COLUMN "archived_by" uuid;
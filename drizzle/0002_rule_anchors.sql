ALTER TABLE "bookings" ADD COLUMN "customs_closing" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "vgm_closing" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "si_closing" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "port_cut_off" date;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "blocking" boolean DEFAULT false NOT NULL;
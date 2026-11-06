ALTER TABLE "bookings" ADD COLUMN "etd_time" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "eta_time" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "customs_closing_time" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "vgm_closing_time" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "si_closing_time" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "port_cut_off_time" text;--> statement-breakpoint
ALTER TABLE "vessels" ADD COLUMN "etd_time" text;--> statement-breakpoint
ALTER TABLE "vessels" ADD COLUMN "eta_time" text;--> statement-breakpoint
ALTER TABLE "vessels" ADD COLUMN "atd_time" text;--> statement-breakpoint
ALTER TABLE "vessels" ADD COLUMN "ata_time" text;
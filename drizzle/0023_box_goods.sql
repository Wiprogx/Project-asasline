ALTER TABLE "containers" ADD COLUMN "hs_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "packages" integer;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "package_type" text;--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "bl_description" text;
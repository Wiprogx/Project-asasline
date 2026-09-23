CREATE TABLE "covers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"absent_id" uuid NOT NULL,
	"cover_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "covers" ADD CONSTRAINT "covers_absent_id_users_id_fk" FOREIGN KEY ("absent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covers" ADD CONSTRAINT "covers_cover_id_users_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "covers_cover_idx" ON "covers" USING btree ("cover_id");--> statement-breakpoint
CREATE INDEX "covers_absent_idx" ON "covers" USING btree ("absent_id");
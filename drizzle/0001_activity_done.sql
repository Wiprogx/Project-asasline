ALTER TABLE "activities" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "done_by" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_role_idx" ON "activities" USING btree ("role","state");--> statement-breakpoint
CREATE INDEX "activities_due_idx" ON "activities" USING btree ("due");
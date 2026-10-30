DROP INDEX "contact_links_live_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "contact_links_live_uq" ON "contact_links" USING btree ("contact_id","linked_id",coalesce("person_role_id", "location_role_id")) WHERE archived_at is null;--> statement-breakpoint
ALTER TABLE "contact_links" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "contact_links" ADD CONSTRAINT "contact_links_one_role" CHECK (num_nonnulls("contact_links"."person_role_id", "contact_links"."location_role_id") = 1);
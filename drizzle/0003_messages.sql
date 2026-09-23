CREATE TYPE "public"."call_outcome" AS ENUM('answered', 'missed', 'voicemail');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('email', 'whatsapp', 'internal', 'call', 'web');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('in', 'out', 'internal');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "message_channel" NOT NULL,
	"direction" "message_direction" NOT NULL,
	"room" text,
	"from_text" text,
	"to_text" text,
	"contact_id" uuid,
	"subject" text,
	"body" text DEFAULT '' NOT NULL,
	"link_kind" text,
	"link_id" uuid,
	"link_ref" text,
	"topic" text,
	"thread_id" text,
	"reply_to_id" uuid,
	"author_id" uuid,
	"call_seconds" integer,
	"call_outcome" "call_outcome",
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_at_idx" ON "messages" USING btree ("at");--> statement-breakpoint
CREATE INDEX "messages_link_idx" ON "messages" USING btree ("link_kind","link_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "messages_room_idx" ON "messages" USING btree ("room","at");
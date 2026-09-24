CREATE TYPE "public"."rate_type" AS ENUM('contract', 'spot');--> statement-breakpoint
CREATE TABLE "price_list_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"price_list_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"sell_cents" integer NOT NULL,
	"buy_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"contact_id" uuid NOT NULL,
	"name" text NOT NULL,
	"valid_from" date,
	"valid_until" date,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"category" text NOT NULL,
	"name" text,
	"pol" text,
	"pod" text,
	"country" char(2),
	"container_type" text,
	"carrier" text,
	"transit_days" integer,
	"from_place" text,
	"to_place" text,
	"doc_code" text,
	"free_days" integer,
	"sell_cents" integer DEFAULT 0 NOT NULL,
	"buy_cents" integer DEFAULT 0 NOT NULL,
	"vat_code" text DEFAULT 'EX41' NOT NULL,
	"rate_type" "rate_type" DEFAULT 'contract' NOT NULL,
	"valid_until" date,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD COLUMN "item_id" uuid;--> statement-breakpoint
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_item_id_rate_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."rate_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "price_list_lines_item_uq" ON "price_list_lines" USING btree ("price_list_id","item_id") WHERE "price_list_lines"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "price_lists_contact_idx" ON "price_lists" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "rate_items_category_idx" ON "rate_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "rate_items_pod_idx" ON "rate_items" USING btree ("pod");--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_item_id_rate_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."rate_items"("id") ON DELETE no action ON UPDATE no action;
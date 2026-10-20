CREATE TABLE "legacy_links" (
	"kind" text NOT NULL,
	"legacy_id" text NOT NULL,
	"record_id" uuid NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legacy_links_kind_legacy_id_pk" PRIMARY KEY("kind","legacy_id")
);

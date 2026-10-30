-- No city is lost: every city a contact or an address typed is now a row it points at (0074),
-- or, typed without a country, kept in its note.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(DISTINCT w, ', ') INTO missing FROM (
    SELECT 'contacts ' || "city" AS w FROM "contacts"
      WHERE btrim(coalesce("city", '')) <> '' AND "city_id" IS NULL AND "country" IS NOT NULL
    UNION ALL SELECT 'contact_addresses ' || "city" FROM "contact_addresses"
      WHERE btrim(coalesce("city", '')) <> '' AND "city_id" IS NULL AND "country" IS NOT NULL
  ) x;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Cities typed that match no city (add them in cities, then run again): %', missing;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "contact_addresses" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN "city";
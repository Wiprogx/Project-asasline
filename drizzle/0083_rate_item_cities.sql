ALTER TABLE "rate_items" ADD COLUMN "from_city_id" uuid;--> statement-breakpoint
ALTER TABLE "rate_items" ADD COLUMN "to_city_id" uuid;--> statement-breakpoint
ALTER TABLE "rate_items" ADD CONSTRAINT "rate_items_from_city_id_cities_id_fk" FOREIGN KEY ("from_city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_items" ADD CONSTRAINT "rate_items_to_city_id_cities_id_fk" FOREIGN KEY ("to_city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The points typed so far, as cities: a name or other name typed in full finds its city, Belgium's
-- first, then the biggest; the words are then written as the catalogue writes them, "Antwerp (BE)".
-- Words no city carries ("Antwerp depot") stay as they are, with no city.
UPDATE "rate_items" r SET "from_city_id" = (
  SELECT c."id" FROM "cities" c
  WHERE c."archived_at" IS NULL AND (
    lower(c."name") = lower(btrim(r."from_place"))
    OR lower(btrim(r."from_place")) = ANY (SELECT lower(a) FROM unnest(c."aliases") a))
  ORDER BY (c."country" = 'BE') DESC, coalesce(c."population", 0) DESC, c."name"
  LIMIT 1)
WHERE r."category" = 'inland' AND r."from_city_id" IS NULL AND btrim(coalesce(r."from_place", '')) <> '';--> statement-breakpoint
UPDATE "rate_items" r SET "to_city_id" = (
  SELECT c."id" FROM "cities" c
  WHERE c."archived_at" IS NULL AND (
    lower(c."name") = lower(btrim(r."to_place"))
    OR lower(btrim(r."to_place")) = ANY (SELECT lower(a) FROM unnest(c."aliases") a))
  ORDER BY (c."country" = 'BE') DESC, coalesce(c."population", 0) DESC, c."name"
  LIMIT 1)
WHERE r."category" = 'inland' AND r."to_city_id" IS NULL AND btrim(coalesce(r."to_place", '')) <> '';--> statement-breakpoint
UPDATE "rate_items" r SET "from_place" = c."name" || ' (' || c."country" || ')' FROM "cities" c
WHERE c."id" = r."from_city_id";--> statement-breakpoint
UPDATE "rate_items" r SET "to_place" = c."name" || ' (' || c."country" || ')' FROM "cities" c
WHERE c."id" = r."to_city_id";

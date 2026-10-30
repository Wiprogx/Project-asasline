-- What a quotation shipped moves onto each box of its destinations (quotation > destination >
-- container > HS); a destination's boxes take its loading as their own.
UPDATE "quotation_routes" r SET "box_details" = (
  SELECT jsonb_agg(b."box") FROM (
    SELECT jsonb_build_object(
      'loadingMode', r."loading_mode", 'loadAddressId', r."load_address_id", 'stops', r."stops",
      'hs', coalesce((
        SELECT jsonb_agg(jsonb_build_object('code', c."code", 'description', c."description") ORDER BY c."position")
        FROM "quotation_commodities" c WHERE c."quotation_id" = r."quotation_id" AND c."archived_at" IS NULL
      ), '[]'::jsonb)) AS "box"
    FROM generate_series(1, greatest(r."boxes", 1)) AS g(n)
  ) b
)
WHERE r."box_details" = '[]'::jsonb
  AND EXISTS (SELECT 1 FROM "quotation_commodities" c WHERE c."quotation_id" = r."quotation_id");
--> statement-breakpoint
DROP TABLE "quotation_commodities" CASCADE;
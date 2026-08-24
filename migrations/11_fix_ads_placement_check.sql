-- The live `ads` table (created by migrations/01_create_tables.sql) has a
-- CHECK constraint on `placement` that only allows
-- ('top', 'middle', 'bottom', 'sidebar', 'in-article', 'footer').
--
-- The admin ad form (src/components/admin/ads/ad-form.tsx) and
-- ad-service.ts's AD_PLACEMENTS catalog were later updated to add a
-- 'ticker' placement - the "Bandeau (Annonce)" scrolling bar rendered
-- directly under the header (the "sous le header" ad the ticket refers
-- to) - but nothing ever updated the live constraint to match, so every
-- attempt to save an ad with placement = 'ticker' was rejected by
-- Postgres and surfaced to the browser as a 400.
--
-- migrations/04_create_ads_table.sql (which does NOT have this
-- constraint at all) never actually ran against the live DB, since it
-- uses `CREATE TABLE IF NOT EXISTS` and the table already existed from
-- 01 - so it's not a source of truth here; 01's constraint is what's
-- actually enforced today.

ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_placement_check;
ALTER TABLE ads ADD CONSTRAINT ads_placement_check
  CHECK (placement IN ('top', 'middle', 'bottom', 'sidebar', 'in-article', 'footer', 'ticker'));

NOTIFY pgrst, 'reload schema';
